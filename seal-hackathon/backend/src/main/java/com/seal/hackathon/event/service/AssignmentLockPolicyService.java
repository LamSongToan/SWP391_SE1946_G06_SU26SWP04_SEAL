package com.seal.hackathon.event.service;

import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.JudgeAssignmentRepository;
import com.seal.hackathon.event.repository.TrackMentorRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AssignmentLockPolicyService {

    private final SubmissionRepository submissionRepository;
    private final TrackRepository trackRepository;
    private final TrackMentorRepository trackMentorRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;

    public AssignmentLockPolicyService(SubmissionRepository submissionRepository,
                                       TrackRepository trackRepository,
                                       TrackMentorRepository trackMentorRepository,
                                       JudgeAssignmentRepository judgeAssignmentRepository) {
        this.submissionRepository = submissionRepository;
        this.trackRepository = trackRepository;
        this.trackMentorRepository = trackMentorRepository;
        this.judgeAssignmentRepository = judgeAssignmentRepository;
    }

    public AssignmentLockDecision mentorAssignmentDecision(HackathonEventEntity event, TrackEntity track) {
        if (!hasEventStarted(event)) {
            return AssignmentLockDecision.unlocked(null);
        }
        boolean alreadyCovered = !trackMentorRepository.findByTrackTrackId(track.getTrackId()).isEmpty();
        if (!alreadyCovered) {
            return AssignmentLockDecision.unlocked(
                    "This event has already started, so you can only fill tracks that still have no mentor assigned."
            );
        }
        return AssignmentLockDecision.locked(
                "Mentor assignment is locked after the event starts once this track already has mentor coverage."
        );
    }

    public AssignmentLockDecision judgeAssignmentDecision(HackathonEventEntity event, RoundEntity round) {
        if (!hasRoundStarted(event, round)) {
            return AssignmentLockDecision.unlocked(null);
        }
        if (Boolean.TRUE.equals(round.getFinalRound())) {
            boolean hasJudge = !judgeAssignmentRepository.findByRoundRoundId(round.getRoundId()).isEmpty();
            if (!hasJudge) {
                return AssignmentLockDecision.unlocked(
                        "This round has already started, so you can only fill the missing final-round judge coverage."
                );
            }
            return AssignmentLockDecision.locked(
                    "Judge assignment is locked after the round starts once the final round already has judge coverage."
            );
        }

        List<TrackEntity> tracks = trackRepository.findByEventIdOrderByTrackIdAsc(round.getEventId());
        boolean hasUncoveredTrack = tracks.stream()
                .anyMatch(track -> judgeAssignmentRepository
                        .findByRoundRoundIdAndTrackTrackId(round.getRoundId(), track.getTrackId())
                        .isEmpty());
        if (hasUncoveredTrack) {
            return AssignmentLockDecision.unlocked(
                    "This round has already started, so you can only fill tracks that still have no judge assigned."
            );
        }
        return AssignmentLockDecision.locked(
                "Judge assignment is locked after the round starts once every track already has judge coverage."
        );
    }

    public AssignmentLockDecision judgeAssignmentDecision(HackathonEventEntity event,
                                                          RoundEntity round,
                                                          TrackEntity track) {
        if (!hasRoundStarted(event, round)) {
            return AssignmentLockDecision.unlocked(null);
        }
        if (Boolean.TRUE.equals(round.getFinalRound())) {
            return judgeAssignmentDecision(event, round);
        }
        boolean alreadyCovered = !judgeAssignmentRepository
                .findByRoundRoundIdAndTrackTrackId(round.getRoundId(), track.getTrackId())
                .isEmpty();
        if (!alreadyCovered) {
            return AssignmentLockDecision.unlocked(
                    "This round has already started, so you can only fill tracks that still have no judge assigned."
            );
        }
        return AssignmentLockDecision.locked(
                "Judge assignment is locked after the round starts once this track already has judge coverage."
        );
    }

    private boolean hasEventStarted(HackathonEventEntity event) {
        if (event == null) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        if (event.getCompetitionStartAt() != null && !now.isBefore(event.getCompetitionStartAt())) {
            return true;
        }
        return submissionRepository.existsByEventId(event.getEventId());
    }

    private boolean hasRoundStarted(HackathonEventEntity event, RoundEntity round) {
        if (round == null) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        if (Boolean.TRUE.equals(round.getScoreLocked())) {
            return true;
        }
        if (submissionRepository.existsByRoundRoundId(round.getRoundId())) {
            return true;
        }
        if (round.getStartAt() != null && !now.isBefore(round.getStartAt())) {
            return true;
        }
        if (round.getRoundOrder() != null
                && round.getRoundOrder() == 1
                && event != null
                && event.getCompetitionStartAt() != null
                && !now.isBefore(event.getCompetitionStartAt())) {
            return true;
        }
        return false;
    }

    public record AssignmentLockDecision(boolean locked, String reason) {

        public static AssignmentLockDecision locked(String reason) {
            return new AssignmentLockDecision(true, reason);
        }

        public static AssignmentLockDecision unlocked(String reason) {
            return new AssignmentLockDecision(false, reason);
        }
    }
}
