package com.seal.hackathon.event.service;

import com.seal.hackathon.auth.entity.MentorProfileEntity;
import com.seal.hackathon.auth.repository.MentorProfileRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.AssignTrackMentorRequest;
import com.seal.hackathon.event.dto.TrackMentorDto;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.entity.TrackMentorEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.TrackMentorRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TrackMentorService {

    private final TrackMentorRepository trackMentorRepository;
    private final TrackRepository trackRepository;
    private final MentorProfileRepository mentorProfileRepository;
    private final HackathonEventRepository eventRepository;
    private final UserRepository userRepository;

    public TrackMentorService(TrackMentorRepository trackMentorRepository,
                               TrackRepository trackRepository,
                               MentorProfileRepository mentorProfileRepository,
                               HackathonEventRepository eventRepository,
                               UserRepository userRepository) {
        this.trackMentorRepository = trackMentorRepository;
        this.trackRepository = trackRepository;
        this.mentorProfileRepository = mentorProfileRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<TrackMentorDto> listByTrack(Integer trackId) {
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
        MentorProfileEntity mentor = mentorProfileRepository.findById(request.mentorUserRoleId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Mentor profile not found"));

        if (trackMentorRepository.existsByTrackTrackIdAndMentorUserRoleId(request.trackId(), request.mentorUserRoleId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Mentor is already assigned to this track");
        }

        TrackMentorEntity entity = new TrackMentorEntity();
        entity.setTrack(track);
        entity.setMentor(mentor);
        return toDto(trackMentorRepository.save(entity));
    }

    @Transactional
    public void remove(Integer trackMentorId) {
        if (!trackMentorRepository.existsById(trackMentorId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Assignment not found");
        }
        trackMentorRepository.deleteById(trackMentorId);
    }

    private MentorProfileEntity getMentorProfile(Authentication authentication) {
        if (authentication == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        UserEntity user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return mentorProfileRepository.findByUserRoleUserUserId(user.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Mentor profile required"));
    }

    private TrackMentorDto toDto(TrackMentorEntity e) {
        var event = eventRepository.findById(e.getTrack().getEventId()).orElse(null);
        return new TrackMentorDto(
                e.getTrackMentorId(),
                e.getTrack().getTrackId(),
                e.getTrack().getName(),
                event == null ? null : event.getEventId(),
                event == null ? null : event.getName(),
                e.getMentor().getUserRoleId(),
                e.getMentor().getUserRole().getUser().getFullName(),
                e.getMentor().getUserRole().getUser().getEmail(),
                e.getMentor().getDepartment(),
                e.getMentor().getSpecialization(),
                e.getAssignedAt()
        );
    }
}