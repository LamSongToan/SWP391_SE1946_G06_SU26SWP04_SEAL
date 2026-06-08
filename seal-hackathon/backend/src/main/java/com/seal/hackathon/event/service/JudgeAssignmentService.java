package com.seal.hackathon.event.service;

import com.seal.hackathon.auth.entity.JudgeProfileEntity;
import com.seal.hackathon.auth.repository.JudgeProfileRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.AssignJudgeRequest;
import com.seal.hackathon.event.dto.JudgeAssignmentDto;
import com.seal.hackathon.event.entity.JudgeAssignmentEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.TrackEntity;
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

    public JudgeAssignmentService(JudgeAssignmentRepository assignmentRepository,
                                   RoundRepository roundRepository,
                                   TrackRepository trackRepository,
                                   HackathonEventRepository eventRepository,
                                   JudgeProfileRepository judgeProfileRepository) {
        this.assignmentRepository = assignmentRepository;
        this.roundRepository = roundRepository;
        this.trackRepository = trackRepository;
        this.eventRepository = eventRepository;
        this.judgeProfileRepository = judgeProfileRepository;
    }

    @Transactional(readOnly = true)
    public List<JudgeAssignmentDto> listByRound(Integer roundId) {
        getRoundOrThrow(roundId);
        return assignmentRepository.findByRoundRoundId(roundId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<JudgeAssignmentDto> listByRoundAndTrack(Integer roundId, Integer trackId) {
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
        TrackEntity track = trackRepository.findById(request.trackId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Track not found"));

        if (!track.getEventId().equals(round.getEventId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Track does not belong to the same event as this round");
        }

        JudgeProfileEntity judge = judgeProfileRepository.findById(request.judgeUserRoleId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Judge profile not found"));

        if (assignmentRepository.existsByRoundRoundIdAndTrackTrackIdAndJudgeUserRoleId(
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

    private RoundEntity getRoundOrThrow(Integer roundId) {
        return roundRepository.findById(roundId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round not found"));
    }

    private JudgeAssignmentDto toDto(JudgeAssignmentEntity e) {
        var event = eventRepository.findById(e.getRound().getEventId()).orElse(null);
        return new JudgeAssignmentDto(
                e.getJudgeAssignmentId(),
                e.getRound().getRoundId(),
                e.getRound().getRoundName(),
                e.getTrack().getTrackId(),
                e.getTrack().getName(),
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