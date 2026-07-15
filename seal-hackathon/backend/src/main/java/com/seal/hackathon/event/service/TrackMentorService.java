package com.seal.hackathon.event.service;

import com.seal.hackathon.auth.entity.MentorProfileEntity;
import com.seal.hackathon.auth.repository.MentorProfileRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.AssignTrackMentorRequest;
import com.seal.hackathon.event.dto.TrackMentorDto;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.JudgeAssignmentEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.entity.TrackMentorEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.JudgeAssignmentRepository;
import com.seal.hackathon.event.repository.TrackMentorRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDateTime;

@Service
public class TrackMentorService {

    private final TrackMentorRepository trackMentorRepository;
    private final TrackRepository trackRepository;
    private final MentorProfileRepository mentorProfileRepository;
    private final HackathonEventRepository eventRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final UserRepository userRepository;
    private final AssignmentLockPolicyService assignmentLockPolicyService;

    public TrackMentorService(TrackMentorRepository trackMentorRepository,
                               TrackRepository trackRepository,
                               MentorProfileRepository mentorProfileRepository,
                               HackathonEventRepository eventRepository,
                               JudgeAssignmentRepository judgeAssignmentRepository,
                               UserRepository userRepository,
                               AssignmentLockPolicyService assignmentLockPolicyService) {
        this.trackMentorRepository = trackMentorRepository;
        this.trackRepository = trackRepository;
        this.mentorProfileRepository = mentorProfileRepository;
        this.eventRepository = eventRepository;
        this.judgeAssignmentRepository = judgeAssignmentRepository;
        this.userRepository = userRepository;
        this.assignmentLockPolicyService = assignmentLockPolicyService;
    }

    @Transactional(readOnly = true)
    public List<TrackMentorDto> listByTrack(Integer trackId) {
        TrackEntity track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Track not found"));
        HackathonEventEntity event = getEventOrThrow(track.getEventId());
        if (isEventEnded(event)) {
            return List.of();
        }
        return trackMentorRepository.findByTrackTrackId(trackId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TrackMentorDto> listMyTracks(Authentication authentication) {
        MentorProfileEntity mentor = getMentorProfile(authentication);
        return trackMentorRepository.findByMentorUserRoleId(mentor.getUserRoleId())
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public TrackMentorDto assign(AssignTrackMentorRequest request) {
        TrackEntity track = trackRepository.findById(request.trackId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Track not found"));
        HackathonEventEntity event = eventRepository.findById(track.getEventId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));
        MentorProfileEntity mentor = mentorProfileRepository.findById(request.mentorUserRoleId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Mentor profile not found"));

        if (trackMentorRepository.existsByTrackTrackIdAndMentorUserRoleId(request.trackId(), request.mentorUserRoleId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Mentor is already assigned to this track");
        }
        requireActiveEvent(event);
        AssignmentLockPolicyService.AssignmentLockDecision assignmentDecision =
                assignmentLockPolicyService.mentorAssignmentDecision(event, track);
        if (assignmentDecision.locked()) {
            throw new ApiException(HttpStatus.CONFLICT, assignmentDecision.reason());
        }
        validateSingleTrackMentorConstraint(track, mentor);
        validateCrossRoleConflict(track, mentor);

        TrackMentorEntity entity = new TrackMentorEntity();
        entity.setTrack(track);
        entity.setMentor(mentor);
        return toDto(trackMentorRepository.save(entity));
    }

    @Transactional
    public void remove(Integer trackMentorId) {
        TrackMentorEntity assignment = trackMentorRepository.findById(trackMentorId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Assignment not found"));
        requireActiveEvent(getEventOrThrow(assignment.getTrack().getEventId()));
        trackMentorRepository.delete(assignment);
    }

    private MentorProfileEntity getMentorProfile(Authentication authentication) {
        if (authentication == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        UserEntity user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return mentorProfileRepository.findByUserRoleUserUserId(user.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Mentor profile required"));
    }

    private void validateSingleTrackMentorConstraint(TrackEntity track, MentorProfileEntity mentor) {
        List<TrackMentorEntity> sameEventAssignments = trackMentorRepository
                .findByMentorUserRoleIdAndTrackEventId(mentor.getUserRoleId(), track.getEventId());
        if (sameEventAssignments.isEmpty()) {
            return;
        }

        TrackMentorEntity existingAssignment = sameEventAssignments.stream()
                .filter(assignment -> assignment.getTrack() != null
                        && !assignment.getTrack().getTrackId().equals(track.getTrackId()))
                .findFirst()
                .orElse(null);
        if (existingAssignment == null) {
            return;
        }

        String existingTrackName = existingAssignment.getTrack().getName();
        throw new ApiException(HttpStatus.BAD_REQUEST,
                "This mentor is already assigned to track "
                        + existingTrackName
                        + " in the same event. A mentor can only mentor one track per event");
    }

    private void validateCrossRoleConflict(TrackEntity track, MentorProfileEntity mentor) {
        Integer userId = mentor.getUserRole().getUser().getUserId();
        List<JudgeAssignmentEntity> judgeAssignments = judgeAssignmentRepository
                .findByJudgeUserIdAndRoundEventId(userId, track.getEventId());
        if (judgeAssignments.isEmpty()) {
            return;
        }
        boolean finalRoundConflict = judgeAssignments.stream()
                .anyMatch(assignment -> Boolean.TRUE.equals(assignment.getRound().getFinalRound()));
        if (finalRoundConflict) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "This user is already assigned as a final-round judge in the same event and cannot mentor any track there");
        }
        boolean sameTrackConflict = judgeAssignments.stream()
                .anyMatch(assignment -> assignment.getTrack() != null
                        && assignment.getTrack().getTrackId().equals(track.getTrackId()));
        if (sameTrackConflict) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "This user already judges this track in the same event. Mentor and judge assignments must stay on different tracks");
        }
    }

    private TrackMentorDto toDto(TrackMentorEntity e) {
        var event = eventRepository.findById(e.getTrack().getEventId()).orElse(null);
        boolean feedbackEnabled = event != null && !isEventEnded(event);
        return new TrackMentorDto(
                e.getTrackMentorId(),
                e.getTrack().getTrackId(),
                e.getTrack().getName(),
                event == null ? null : event.getEventId(),
                event == null ? null : event.getName(),
                event == null ? null : effectiveEventStatus(event).getDbValue(),
                feedbackEnabled,
                e.getMentor().getUserRoleId(),
                e.getMentor().getUserRole().getUser().getFullName(),
                e.getMentor().getUserRole().getUser().getEmail(),
                e.getMentor().getDepartment(),
                e.getMentor().getSpecialization(),
                e.getAssignedAt()
        );
    }

    private HackathonEventEntity getEventOrThrow(Integer eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    private void requireActiveEvent(HackathonEventEntity event) {
        if (isEventEnded(event)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Mentor assignments can no longer be managed after the event has ended");
        }
    }

    private boolean isEventEnded(HackathonEventEntity event) {
        return effectiveEventStatus(event).isTerminal();
    }

    private EventStatus effectiveEventStatus(HackathonEventEntity event) {
        if (event.getCompetitionEndAt() != null
                && !event.getCompetitionEndAt().isAfter(LocalDateTime.now())) {
            return EventStatus.ENDED;
        }
        return EventStatus.from(event.getStatus());
    }
}
