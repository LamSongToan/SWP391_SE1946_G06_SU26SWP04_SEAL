package com.seal.hackathon.submission.service;

import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.auth.repository.JudgeProfileRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.JudgeAssignmentEntity;
import com.seal.hackathon.event.entity.ScoringCriteriaEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.JudgeAssignmentRepository;
import com.seal.hackathon.event.repository.ScoringCriteriaRepository;
import com.seal.hackathon.submission.dto.ScoreDto;
import com.seal.hackathon.submission.dto.ScoreRequest;
import com.seal.hackathon.submission.entity.ScoreEntity;
import com.seal.hackathon.submission.entity.SubmissionEntity;
import com.seal.hackathon.submission.repository.ScoreRepository;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ScoringService {

    private final ScoreRepository scoreRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final JudgeProfileRepository judgeProfileRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final ScoringCriteriaRepository criteriaRepository;
    private final HackathonEventRepository eventRepository;

    public ScoringService(ScoreRepository scoreRepository,
                          SubmissionRepository submissionRepository,
                          UserRepository userRepository,
                          JudgeProfileRepository judgeProfileRepository,
                          JudgeAssignmentRepository judgeAssignmentRepository,
                          ScoringCriteriaRepository criteriaRepository,
                          HackathonEventRepository eventRepository) {
        this.scoreRepository = scoreRepository;
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
        this.judgeProfileRepository = judgeProfileRepository;
        this.judgeAssignmentRepository = judgeAssignmentRepository;
        this.criteriaRepository = criteriaRepository;
        this.eventRepository = eventRepository;
    }

    @Transactional(readOnly = true)
    public List<ScoreDto> listScoresForSubmission(Integer submissionId) {
        getSubmissionOrThrow(submissionId);
        return scoreRepository.findBySubmissionSubmissionId(submissionId)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ScoreDto> listMyScores(Authentication authentication) {
        var judgeProfile = getJudgeProfile(authentication);
        return scoreRepository.findByJudgeAssignmentJudgeUserRoleId(judgeProfile.getUserRoleId())
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public ScoreDto submitScore(Authentication authentication, Integer submissionId, ScoreRequest request) {
        var judgeProfile = getJudgeProfile(authentication);
        SubmissionEntity submission = getSubmissionOrThrow(submissionId);

        var event = eventRepository.findById(submission.getTeam().getTrack().getEventId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));
        if (EventStatus.from(event.getStatus()) != EventStatus.ONGOING) {
            throw new ApiException(HttpStatus.CONFLICT, "Scoring is only open while the event is Ongoing");
        }

        ScoringCriteriaEntity criteria = criteriaRepository.findById(request.criteriaId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Scoring criteria not found"));

        if (!criteria.getRoundId().equals(submission.getRound().getRoundId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Criteria does not belong to this submission's round");
        }

        JudgeAssignmentEntity judgeAssignment = judgeAssignmentRepository
                .findByRoundRoundIdAndTrackTrackIdAndJudgeUserRoleId(
                        submission.getRound().getRoundId(),
                        submission.getTeam().getTrack().getTrackId(),
                        judgeProfile.getUserRoleId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN,
                        "Judge is not assigned to this round and track"));

        ScoreEntity entity = scoreRepository
                .findBySubmissionSubmissionIdAndCriteriaCriteriaIdAndJudgeAssignmentJudgeAssignmentId(
                        submissionId, request.criteriaId(), judgeAssignment.getJudgeAssignmentId())
                .orElse(new ScoreEntity());

        entity.setSubmission(submission);
        entity.setCriteria(criteria);
        entity.setJudgeAssignment(judgeAssignment);
        entity.setScoreValue(request.scoreValue());
        entity.setComment(request.comment());
        return toDto(scoreRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<ScoreDto> listSubmissionsForJudge(Authentication authentication) {
        var judgeProfile = getJudgeProfile(authentication);
        var assignments = judgeAssignmentRepository.findByJudgeUserRoleId(judgeProfile.getUserRoleId());
        return assignments.stream()
                .flatMap(a -> submissionRepository
                        .findByTeamTeamIdOrderByRoundRoundOrderAscSubmittedAtDesc(
                                a.getRound().getRoundId())
                        .stream())
                .distinct()
                .map(s -> {
                    var scores = scoreRepository.findBySubmissionSubmissionId(s.getSubmissionId());
                    return scores.isEmpty() ? toEmptyScoreDto(s, judgeProfile.getUserRoleId()) : toDto(scores.get(0));
                })
                .toList();
    }

    private com.seal.hackathon.auth.entity.JudgeProfileEntity getJudgeProfile(Authentication authentication) {
        if (authentication == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        UserEntity user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return judgeProfileRepository.findByUserRoleUserUserId(user.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Judge profile required"));
    }

    private SubmissionEntity getSubmissionOrThrow(Integer submissionId) {
        return submissionRepository.findDetailedById(submissionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Submission not found"));
    }

    private ScoreDto toDto(ScoreEntity e) {
        return new ScoreDto(
                e.getScoreId(),
                e.getSubmission().getSubmissionId(),
                e.getSubmission().getTeam().getTeamName(),
                e.getSubmission().getRound().getRoundName(),
                e.getCriteria().getCriteriaId(),
                e.getCriteria().getCriteriaName(),
                e.getJudgeAssignment().getJudgeAssignmentId(),
                e.getJudgeAssignment().getJudge().getUserRoleId(),
                e.getJudgeAssignment().getJudge().getUserRole().getUser().getFullName(),
                e.getScoreValue(),
                e.getComment(),
                e.getScoredAt()
        );
    }

    private ScoreDto toEmptyScoreDto(SubmissionEntity s, Integer judgeUserRoleId) {
        return new ScoreDto(null, s.getSubmissionId(), s.getTeam().getTeamName(),
                s.getRound().getRoundName(), null, null, null,
                judgeUserRoleId, null, null, null, null);
    }
}
