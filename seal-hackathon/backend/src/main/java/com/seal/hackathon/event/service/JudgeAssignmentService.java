package com.seal.hackathon.event.service;

import com.seal.hackathon.auth.entity.JudgeProfileEntity;
import com.seal.hackathon.auth.repository.JudgeProfileRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.AssignJudgeRequest;
import com.seal.hackathon.event.dto.JudgeAssignmentDto;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.JudgeAssignmentEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.entity.TrackMentorEntity;
import com.seal.hackathon.event.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class JudgeAssignmentService {

    private final JudgeAssignmentRepository assignmentRepository;
    private final RoundRepository roundRepository;
    private final TrackRepository trackRepository;
    private final HackathonEventRepository eventRepository;
    private final JudgeProfileRepository judgeProfileRepository;
    private final TrackMentorRepository trackMentorRepository;
    private final AssignmentLockPolicyService assignmentLockPolicyService;

    public JudgeAssignmentService(JudgeAssignmentRepository assignmentRepository,
                                   RoundRepository roundRepository,
                                   TrackRepository trackRepository,
                                   HackathonEventRepository eventRepository,
                                   JudgeProfileRepository judgeProfileRepository,
                                   TrackMentorRepository trackMentorRepository,
                                   AssignmentLockPolicyService assignmentLockPolicyService) {
        this.assignmentRepository = assignmentRepository;
        this.roundRepository = roundRepository;
        this.trackRepository = trackRepository;
        this.eventRepository = eventRepository;
        this.judgeProfileRepository = judgeProfileRepository;
        this.trackMentorRepository = trackMentorRepository;
        this.assignmentLockPolicyService = assignmentLockPolicyService;
    }

    @Transactional(readOnly = true)
    public List<JudgeAssignmentDto> listByRound(Integer roundId) {
        getRoundOrThrow(roundId);
        return assignmentRepository.findByRoundRoundId(roundId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<JudgeAssignmentDto> listByRoundAndTrack(Integer roundId, Integer trackId) {
        RoundEntity round = getRoundOrThrow(roundId);
        if (Boolean.TRUE.equals(round.getFinalRound())) {
            return assignmentRepository.findByRoundRoundId(roundId)
                    .stream().map(this::toDto).toList();
        }
        return assignmentRepository.findByRoundRoundIdAndTrackTrackId(roundId, trackId)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<JudgeAssignmentDto> listMyAssignments(Integer judgeUserRoleId) {
        return assignmentRepository.findByJudgeUserRoleId(judgeUserRoleId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public JudgeAssignmentDto assign(Integer roundId, AssignJudgeRequest request) {
        RoundEntity round = getRoundOrThrow(roundId);
        HackathonEventEntity event = eventRepository.findById(round.getEventId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));
        boolean finalRound = Boolean.TRUE.equals(round.getFinalRound());
        TrackEntity track;
        if (finalRound) {
            track = trackRepository.findByEventIdOrderByTrackIdAsc(round.getEventId())
                    .stream()
                    .findFirst()
                    .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "Create at least one track before assigning judges"));
        } else {
            if (request.trackId() == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Track is required for qualifying rounds");
            }
            track = trackRepository.findById(request.trackId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Track not found"));
            if (!track.getEventId().equals(round.getEventId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Track does not belong to the same event as this round");
            }
        }

        JudgeProfileEntity judge = judgeProfileRepository.findById(request.judgeUserRoleId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Judge profile not found"));
        AssignmentLockPolicyService.AssignmentLockDecision assignmentDecision =
                assignmentLockPolicyService.judgeAssignmentDecision(event, round, track);
        if (assignmentDecision.locked()) {
            throw new ApiException(HttpStatus.CONFLICT, assignmentDecision.reason());
        }
        validateCrossRoleConflict(round, track, judge);

        if (finalRound) {
            if (assignmentRepository.existsByRoundRoundIdAndJudgeUserRoleId(roundId, request.judgeUserRoleId())) {
                throw new ApiException(HttpStatus.CONFLICT, "Judge is already assigned to this final round");
            }
        } else if (assignmentRepository.existsByRoundRoundIdAndTrackTrackIdAndJudgeUserRoleId(
                roundId, request.trackId(), request.judgeUserRoleId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Judge is already assigned to this round and track");
        }

        JudgeAssignmentEntity entity = new JudgeAssignmentEntity();
        entity.setRound(round);
        entity.setTrack(track);
        entity.setJudge(judge);
        return toDto(assignmentRepository.save(entity));
    }

    @Transactional
    public void remove(Integer assignmentId) {
        if (!assignmentRepository.existsById(assignmentId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Assignment not found");
        }
        assignmentRepository.deleteById(assignmentId);
    }

    private void validateCrossRoleConflict(RoundEntity round, TrackEntity track, JudgeProfileEntity judge) {
        Integer userId = judge.getUserRole().getUser().getUserId();
        List<TrackMentorEntity> mentorAssignments = trackMentorRepository
                .findByMentorUserIdAndTrackEventId(userId, round.getEventId());
        if (mentorAssignments.isEmpty()) {
            return;
        }
        if (Boolean.TRUE.equals(round.getFinalRound())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "This user mentors at least one track in the same event and cannot judge the final round");
        }
        boolean sameTrackConflict = mentorAssignments.stream()
                .anyMatch(assignment -> assignment.getTrack() != null
                        && assignment.getTrack().getTrackId().equals(track.getTrackId()));
        if (sameTrackConflict) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "This user already mentors this track in the same event. Mentor and judge assignments must stay on different tracks");
        }
    }

    private RoundEntity getRoundOrThrow(Integer roundId) {
        return roundRepository.findById(roundId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round not found"));
    }

    private JudgeAssignmentDto toDto(JudgeAssignmentEntity e) {
        var event = eventRepository.findById(e.getRound().getEventId()).orElse(null);
        boolean finalRound = Boolean.TRUE.equals(e.getRound().getFinalRound());
        return new JudgeAssignmentDto(
                e.getJudgeAssignmentId(),
                e.getRound().getRoundId(),
                e.getRound().getRoundName(),
                finalRound ? null : e.getTrack().getTrackId(),
                finalRound ? "All finalists" : e.getTrack().getName(),
                event == null ? null : event.getEventId(),
                event == null ? null : event.getName(),
                e.getJudge().getUserRoleId(),
                e.getJudge().getUserRole().getUser().getFullName(),
                e.getJudge().getUserRole().getUser().getEmail(),
                e.getJudge().getOrganization(),
                e.getJudge().getJudgeType(),
                e.getAssignedAt()
        );
    }
}
