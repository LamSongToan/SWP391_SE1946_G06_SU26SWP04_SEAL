package com.seal.hackathon.evaluation.service;

import com.seal.hackathon.auth.entity.RoleType;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserRoleEntity;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.auth.repository.UserRoleRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.evaluation.dto.AssignedRoundDto;
import com.seal.hackathon.evaluation.dto.CriterionScoreDto;
import com.seal.hackathon.evaluation.dto.CriterionScoreRequest;
import com.seal.hackathon.evaluation.dto.EvaluationSubmissionDto;
import com.seal.hackathon.evaluation.dto.FeedbackDto;
import com.seal.hackathon.evaluation.dto.FeedbackRequest;
import com.seal.hackathon.evaluation.dto.JudgeDashboardDto;
import com.seal.hackathon.evaluation.dto.MentorDashboardDto;
import com.seal.hackathon.evaluation.dto.MentorTeamDto;
import com.seal.hackathon.evaluation.dto.ScoreFormDto;
import com.seal.hackathon.evaluation.dto.ScoreHistoryDto;
import com.seal.hackathon.evaluation.dto.ScoreSubmissionRequest;
import com.seal.hackathon.evaluation.entity.FeedbackEntity;
import com.seal.hackathon.evaluation.entity.JudgeAssignmentEntity;
import com.seal.hackathon.evaluation.entity.JudgeEvaluationEntity;
import com.seal.hackathon.evaluation.entity.ScoreEntity;
import com.seal.hackathon.evaluation.entity.ScoreHistoryEntity;
import com.seal.hackathon.evaluation.entity.ScoringCriteriaEntity;
import com.seal.hackathon.evaluation.repository.FeedbackRepository;
import com.seal.hackathon.evaluation.repository.JudgeAssignmentRepository;
import com.seal.hackathon.evaluation.repository.JudgeEvaluationRepository;
import com.seal.hackathon.evaluation.repository.ScoreRepository;
import com.seal.hackathon.evaluation.repository.ScoreHistoryRepository;
import com.seal.hackathon.evaluation.repository.ScoringCriteriaRepository;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.submission.entity.SubmissionEntity;
import com.seal.hackathon.submission.entity.SubmissionStatus;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import com.seal.hackathon.team.entity.TeamEntity;
import com.seal.hackathon.team.repository.TeamMemberRepository;
import com.seal.hackathon.team.repository.TeamRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class EvaluationService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final HackathonEventRepository eventRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoringCriteriaRepository criteriaRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final ScoreRepository scoreRepository;
    private final JudgeEvaluationRepository evaluationRepository;
    private final ScoreHistoryRepository scoreHistoryRepository;
    private final FeedbackRepository feedbackRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final AuditLogService auditLogService;

    public EvaluationService(UserRepository userRepository,
                             UserRoleRepository userRoleRepository,
                             HackathonEventRepository eventRepository,
                             SubmissionRepository submissionRepository,
                             ScoringCriteriaRepository criteriaRepository,
                             JudgeAssignmentRepository judgeAssignmentRepository,
                             ScoreRepository scoreRepository,
                             JudgeEvaluationRepository evaluationRepository,
                             ScoreHistoryRepository scoreHistoryRepository,
                             FeedbackRepository feedbackRepository,
                             TeamRepository teamRepository,
                             TeamMemberRepository teamMemberRepository,
                             AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.eventRepository = eventRepository;
        this.submissionRepository = submissionRepository;
        this.criteriaRepository = criteriaRepository;
        this.judgeAssignmentRepository = judgeAssignmentRepository;
        this.scoreRepository = scoreRepository;
        this.evaluationRepository = evaluationRepository;
        this.scoreHistoryRepository = scoreHistoryRepository;
        this.feedbackRepository = feedbackRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public JudgeDashboardDto getJudgeDashboard(Authentication authentication) {
        UserRoleEntity judgeRole = currentRole(authentication, RoleType.JUDGE);
        List<JudgeAssignmentEntity> assignments = judgeAssignmentRepository
                .findByJudgeRoleUserRoleIdOrderByRoundRoundOrderAscTrackNameAsc(judgeRole.getUserRoleId());
        List<SubmissionEntity> submissions = submissionRepository.findAssignedToJudge(judgeRole.getUserRoleId());
        Map<Integer, HackathonEventEntity> eventsById = eventsById(assignments, submissions);
        Map<Integer, Integer> criteriaCounts = criteriaCountsByRound(submissions);
        Map<Integer, List<ScoreEntity>> scoresBySubmission = scoresBySubmissionForJudge(
                judgeRole.getUserRoleId(),
                submissions
        );
        Map<Integer, JudgeEvaluationEntity> evaluationsBySubmission = evaluationRepository
                .findByJudgeAssignmentJudgeRoleUserRoleId(judgeRole.getUserRoleId())
                .stream()
                .collect(Collectors.toMap(
                        evaluation -> evaluation.getSubmission().getSubmissionId(),
                        Function.identity(),
                        (left, right) -> left
                ));

        List<EvaluationSubmissionDto> submissionDtos = submissions.stream()
                .map(submission -> toEvaluationSubmissionDto(
                        submission,
                        judgeRole.getUserRoleId(),
                        scoresBySubmission.getOrDefault(submission.getSubmissionId(), List.of()),
                        criteriaCounts.getOrDefault(submission.getRound().getRoundId(), 0),
                        evaluationsBySubmission.get(submission.getSubmissionId()),
                        eventFromMap(eventsById, submission.getTeam().getTrack().getEventId())
                ))
                .toList();

        List<AssignedRoundDto> roundDtos = assignments.stream()
                .map(assignment -> toAssignedRoundDto(
                        assignment,
                        submissions,
                        evaluationsBySubmission,
                        eventsById.get(assignment.getTrack().getEventId())
                ))
                .toList();

        int pending = (int) submissionDtos.stream().filter(item -> !"Finalized".equals(item.evaluationStatus())).count();
        return new JudgeDashboardDto(
                roundDtos.size(),
                submissionDtos.size(),
                pending,
                (int) scoreRepository.countByJudgeAssignmentJudgeRoleUserRoleId(judgeRole.getUserRoleId()),
                roundDtos,
                submissionDtos
        );
    }

    @Transactional(readOnly = true)
    public ScoreFormDto getScoreForm(Authentication authentication, Integer submissionId) {
        UserRoleEntity judgeRole = currentRole(authentication, RoleType.JUDGE);
        SubmissionEntity submission = getSubmissionOrThrow(submissionId);
        JudgeAssignmentEntity assignment = requireJudgeAssignment(submission, judgeRole.getUserRoleId());
        List<ScoringCriteriaEntity> criteria = criteriaRepository.findByRoundRoundIdOrderByCriteriaIdAsc(submission.getRound().getRoundId());
        List<ScoreEntity> existingScores = scoreRepository
                .findBySubmissionSubmissionIdAndJudgeAssignmentJudgeAssignmentIdOrderByCriteriaCriteriaIdAsc(
                        submissionId,
                        assignment.getJudgeAssignmentId()
                );
        Map<Integer, ScoreEntity> scoreByCriteria = existingScores.stream()
                .collect(Collectors.toMap(score -> score.getCriteria().getCriteriaId(), Function.identity()));
        JudgeEvaluationEntity evaluation = evaluationRepository
                .findBySubmissionSubmissionIdAndJudgeAssignmentJudgeAssignmentId(submissionId, assignment.getJudgeAssignmentId())
                .orElse(null);
        String lockedReason = scoreLockedReason(submission, evaluation);
        List<CriterionScoreDto> criterionDtos = criteria.stream()
                .map(criteriaEntity -> {
                    ScoreEntity score = scoreByCriteria.get(criteriaEntity.getCriteriaId());
                    return toCriterionScoreDto(criteriaEntity, score);
                })
                .toList();

        return new ScoreFormDto(
                toEvaluationSubmissionDto(submission, judgeRole.getUserRoleId(), existingScores, criteria.size(), evaluation),
                assignment.getJudgeAssignmentId(),
                evaluation == null ? null : evaluation.getEvaluationId(),
                evaluation == null ? "NotStarted" : evaluation.getStatus(),
                evaluation == null ? null : evaluation.getFinalizedAt(),
                lockedReason == null,
                lockedReason,
                weightedTotal(criteria, scoreByCriteria),
                criterionDtos,
                evaluation == null ? List.of() : scoreHistoryRepository
                        .findByEvaluationEvaluationIdOrderByCreatedAtDesc(evaluation.getEvaluationId())
                        .stream()
                        .map(this::toScoreHistoryDto)
                        .toList(),
                feedbackHistoryForViewer(submissionId, judgeRole)
        );
    }

    @Transactional
    public ScoreFormDto submitScores(Authentication authentication,
                                     Integer submissionId,
                                     ScoreSubmissionRequest request) {
        UserEntity actor = currentUser(authentication);
        UserRoleEntity judgeRole = currentRole(authentication, RoleType.JUDGE);
        SubmissionEntity submission = getSubmissionOrThrow(submissionId);
        JudgeAssignmentEntity assignment = requireJudgeAssignment(submission, judgeRole.getUserRoleId());
        JudgeEvaluationEntity evaluation = evaluationRepository
                .findBySubmissionSubmissionIdAndJudgeAssignmentJudgeAssignmentId(submissionId, assignment.getJudgeAssignmentId())
                .orElse(null);
        String lockedReason = scoreLockedReason(submission, evaluation);
        if (lockedReason != null) {
            throw new ApiException(HttpStatus.CONFLICT, lockedReason);
        }
        boolean finalize = Boolean.TRUE.equals(request.finalizeScores());

        List<ScoringCriteriaEntity> criteria = criteriaRepository.findByRoundRoundIdOrderByCriteriaIdAsc(submission.getRound().getRoundId());
        if (criteria.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "No scoring criteria are configured for this round");
        }
        Map<Integer, ScoringCriteriaEntity> criteriaById = criteria.stream()
                .collect(Collectors.toMap(ScoringCriteriaEntity::getCriteriaId, Function.identity()));
        Set<Integer> requiredCriteriaIds = new HashSet<>(criteriaById.keySet());
        Set<Integer> submittedCriteriaIds = request.scores().stream()
                .map(CriterionScoreRequest::criteriaId)
                .collect(Collectors.toSet());
        if (submittedCriteriaIds.size() != request.scores().size() || !requiredCriteriaIds.containsAll(submittedCriteriaIds)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Scores contain duplicate or invalid criteria");
        }
        if (finalize && !submittedCriteriaIds.equals(requiredCriteriaIds)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Scores must be submitted for every criterion in this round");
        }

        if (evaluation == null) {
            evaluation = new JudgeEvaluationEntity();
            evaluation.setSubmission(submission);
            evaluation.setJudgeAssignment(assignment);
            evaluation.setStatus("Draft");
            evaluation = evaluationRepository.save(evaluation);
        }

        for (CriterionScoreRequest item : request.scores()) {
            ScoringCriteriaEntity criteriaEntity = criteriaById.get(item.criteriaId());
            BigDecimal normalizedScore = item.scoreValue().setScale(2, RoundingMode.HALF_UP);
            if (normalizedScore.compareTo(BigDecimal.ZERO) < 0 || normalizedScore.compareTo(BigDecimal.TEN) > 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Each criterion score must stay between 0 and 10");
            }
            ScoreEntity score = scoreRepository
                    .findBySubmissionSubmissionIdAndCriteriaCriteriaIdAndJudgeAssignmentJudgeAssignmentId(
                            submissionId,
                            item.criteriaId(),
                            assignment.getJudgeAssignmentId()
                    )
                    .orElseGet(ScoreEntity::new);
            BigDecimal oldScoreValue = score.getScoreValue();
            String oldComment = score.getComment();
            score.setSubmission(submission);
            score.setCriteria(criteriaEntity);
            score.setJudgeAssignment(assignment);
            score.setScoreValue(normalizedScore);
            score.setComment(normalizeOptional(item.comment()));
            scoreRepository.save(score);
            appendScoreHistory(
                    evaluation,
                    criteriaEntity,
                    oldScoreValue,
                    score.getScoreValue(),
                    oldComment,
                    score.getComment(),
                    finalize ? "FINALIZE" : "SAVE_DRAFT"
            );
        }

        if (finalize) {
            evaluation.setStatus("Finalized");
            evaluation.setFinalizedAt(LocalDateTime.now());
            evaluationRepository.save(evaluation);
        }

        if (SubmissionStatus.from(submission.getStatus()) == SubmissionStatus.SUBMITTED) {
            submission.setStatus(SubmissionStatus.EVALUATING.getDbValue());
            submissionRepository.save(submission);
        }
        if (request.feedbackText() != null && !request.feedbackText().trim().isBlank()) {
            appendFeedback(submission, judgeRole, RoleType.JUDGE.getDbValue(), request.feedbackText());
        }
        auditLogService.record(
                actor,
                finalize ? "JUDGE_SCORES_FINALIZED" : "JUDGE_SCORES_SAVED_DRAFT",
                "SUBMISSION",
                submission.getSubmissionId(),
                null,
                Map.of(
                        "teamName", submission.getTeam().getTeamName(),
                        "roundName", submission.getRound().getRoundName(),
                        "criteriaCount", criteria.size(),
                        "evaluationStatus", finalize ? "Finalized" : "Draft"
                ),
                finalize
                        ? "Judge finalized criterion scores for submission " + submission.getTeam().getTeamName()
                        : "Judge saved draft criterion scores for submission " + submission.getTeam().getTeamName()
        );
        return getScoreForm(authentication, submissionId);
    }

    @Transactional(readOnly = true)
    public MentorDashboardDto getMentorDashboard(Authentication authentication) {
        UserRoleEntity mentorRole = currentRole(authentication, RoleType.MENTOR);
        List<TeamEntity> teams = teamRepository.findAssignedToMentor(mentorRole.getUserRoleId());
        List<SubmissionEntity> submissions = submissionRepository.findAssignedToMentor(mentorRole.getUserRoleId());
        Map<Integer, List<SubmissionEntity>> submissionsByTeam = submissions.stream()
                .collect(Collectors.groupingBy(
                        submission -> submission.getTeam().getTeamId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
        List<MentorTeamDto> teamDtos = teams.stream()
                .map(team -> toMentorTeamDto(team, submissionsByTeam.getOrDefault(team.getTeamId(), List.of())))
                .toList();
        return new MentorDashboardDto(
                (int) teamRepository.countAssignedTracksForMentor(mentorRole.getUserRoleId()),
                teams.size(),
                submissions.size(),
                (int) feedbackRepository.countByAuthorRoleUserRoleId(mentorRole.getUserRoleId()),
                teamDtos
        );
    }

    @Transactional(readOnly = true)
    public List<FeedbackDto> listFeedbackForAuthorizedUser(Authentication authentication, Integer submissionId) {
        SubmissionEntity submission = getSubmissionOrThrow(submissionId);
        UserRoleEntity viewerRole = requireFeedbackAccess(authentication, submission, false);
        return feedbackHistoryForViewer(submissionId, viewerRole);
    }

    @Transactional
    public FeedbackDto addFeedback(Authentication authentication, Integer submissionId, FeedbackRequest request) {
        SubmissionEntity submission = getSubmissionOrThrow(submissionId);
        UserEntity actor = currentUser(authentication);
        UserRoleEntity authorRole = requireFeedbackAccess(authentication, submission, true);
        FeedbackEntity saved = appendFeedback(submission, authorRole, authorRole.getRoleType(), request.feedbackText());
        auditLogService.record(
                actor,
                "SUBMISSION_FEEDBACK_ADDED",
                "SUBMISSION",
                submissionId,
                null,
                Map.of(
                        "teamName", submission.getTeam().getTeamName(),
                        "authorRole", authorRole.getRoleType(),
                        "feedbackLength", saved.getFeedbackText().length()
                ),
                authorRole.getRoleType() + " added feedback for submission " + submission.getTeam().getTeamName()
        );
        return toFeedbackDto(saved);
    }

    @Transactional
    public void reopenEvaluation(Authentication authentication, Integer evaluationId) {
        UserEntity actor = currentUser(authentication);
        currentRole(authentication, RoleType.COORDINATOR);
        JudgeEvaluationEntity evaluation = evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Evaluation not found"));
        if (!"Finalized".equalsIgnoreCase(evaluation.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Only finalized evaluations can be reopened");
        }

        EventStatus eventStatus = EventStatus.from(eventFor(evaluation.getSubmission()).getStatus());
        if (eventStatus.isTerminal()) {
            throw new ApiException(HttpStatus.CONFLICT, "Evaluation cannot be reopened after event results are closed");
        }

        evaluation.setStatus("Draft");
        evaluation.setFinalizedAt(null);
        evaluationRepository.save(evaluation);

        List<ScoreEntity> existingScores = scoreRepository
                .findBySubmissionSubmissionIdAndJudgeAssignmentJudgeAssignmentIdOrderByCriteriaCriteriaIdAsc(
                        evaluation.getSubmission().getSubmissionId(),
                        evaluation.getJudgeAssignment().getJudgeAssignmentId()
                );
        for (ScoreEntity score : existingScores) {
            appendScoreHistory(
                    evaluation,
                    score.getCriteria(),
                    score.getScoreValue(),
                    score.getScoreValue(),
                    score.getComment(),
                    score.getComment(),
                    "REOPEN"
            );
        }
        auditLogService.record(
                actor,
                "JUDGE_EVALUATION_REOPENED",
                "SUBMISSION",
                evaluation.getSubmission().getSubmissionId(),
                Map.of(
                        "status", "Finalized",
                        "submissionId", evaluation.getSubmission().getSubmissionId(),
                        "evaluationId", evaluationId
                ),
                Map.of(
                        "status", "Draft",
                        "submissionId", evaluation.getSubmission().getSubmissionId(),
                        "evaluationId", evaluationId
                ),
                "Coordinator reopened a finalized evaluation for submission " + evaluation.getSubmission().getTeam().getTeamName()
        );
    }

    private FeedbackEntity appendFeedback(SubmissionEntity submission,
                                          UserRoleEntity authorRole,
                                          String authorRoleType,
                                          String feedbackText) {
        FeedbackEntity feedback = new FeedbackEntity();
        feedback.setSubmission(submission);
        feedback.setAuthorRole(authorRole);
        feedback.setAuthorRoleType(authorRoleType);
        feedback.setFeedbackText(normalizeRequired(feedbackText, "Feedback"));
        return feedbackRepository.save(feedback);
    }

    private UserRoleEntity requireFeedbackAccess(Authentication authentication,
                                                SubmissionEntity submission,
                                                boolean writing) {
        UserEntity user = currentUser(authentication);
        if (!writing) {
            if (teamMemberRepository.existsByTeamTeamIdAndStudentUserRoleId(
                    submission.getTeam().getTeamId(),
                    findRoleIdIfPresent(user, RoleType.STUDENT)
            )) {
                return userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(user.getUserId(), RoleType.STUDENT.getDbValue())
                        .orElseThrow();
            }
        }

        Integer judgeRoleId = findRoleIdIfPresent(user, RoleType.JUDGE);
        if (judgeRoleId != null && isJudgeAssigned(submission, judgeRoleId)) {
            return userRoleRepository.findById(judgeRoleId).orElseThrow();
        }

        Integer mentorRoleId = findRoleIdIfPresent(user, RoleType.MENTOR);
        if (mentorRoleId != null && teamRepository.existsMentorAssignmentForTeam(mentorRoleId, submission.getTeam().getTeamId())) {
            return userRoleRepository.findById(mentorRoleId).orElseThrow();
        }

        if (!writing) {
            Integer coordinatorRoleId = findRoleIdIfPresent(user, RoleType.COORDINATOR);
            if (coordinatorRoleId != null) {
                return userRoleRepository.findById(coordinatorRoleId).orElseThrow();
            }
        }

        throw new ApiException(HttpStatus.FORBIDDEN, writing
                ? "Only assigned judges or mentors can provide feedback"
                : "You are not allowed to view this feedback");
    }

    private UserRoleEntity currentRole(Authentication authentication, RoleType roleType) {
        UserEntity user = currentUser(authentication);
        return userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(user.getUserId(), roleType.getDbValue())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, roleType.getDbValue() + " role is required"));
    }

    private UserEntity currentUser(Authentication authentication) {
        if (authentication == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Integer findRoleIdIfPresent(UserEntity user, RoleType roleType) {
        return userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(user.getUserId(), roleType.getDbValue())
                .map(UserRoleEntity::getUserRoleId)
                .orElse(null);
    }

    private SubmissionEntity getSubmissionOrThrow(Integer submissionId) {
        return submissionRepository.findDetailedById(submissionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Submission not found"));
    }

    private JudgeAssignmentEntity requireJudgeAssignment(SubmissionEntity submission, Integer judgeRoleId) {
        return judgeAssignmentRepository
                .findByRoundRoundIdAndTrackTrackIdAndJudgeRoleUserRoleId(
                        submission.getRound().getRoundId(),
                        submission.getTeam().getTrack().getTrackId(),
                        judgeRoleId
                )
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "This submission is not assigned to the current judge"));
    }

    private boolean isJudgeAssigned(SubmissionEntity submission, Integer judgeRoleId) {
        return judgeAssignmentRepository
                .findByRoundRoundIdAndTrackTrackIdAndJudgeRoleUserRoleId(
                        submission.getRound().getRoundId(),
                        submission.getTeam().getTrack().getTrackId(),
                        judgeRoleId
                )
                .isPresent();
    }

    private String scoreLockedReason(SubmissionEntity submission, JudgeEvaluationEntity evaluation) {
        if (Boolean.TRUE.equals(submission.getRound().getScoreLocked())) {
            return "Score editing is locked because this round is closed";
        }
        return scoreLockedReason(submission, evaluation, eventFor(submission));
    }

    private String scoreLockedReason(SubmissionEntity submission,
                                     JudgeEvaluationEntity evaluation,
                                     HackathonEventEntity event) {
        if (Boolean.TRUE.equals(submission.getRound().getScoreLocked())) {
            return "Score editing is locked because this round is closed";
        }
        EventStatus status = EventStatus.from(event.getStatus());
        if (status.isTerminal()) {
            return "Score editing is locked after event results are closed";
        }
        if (submission.getRound().getSubmissionDeadline() == null) {
            return "Scoring opens only after the submission deadline is configured";
        }
        if (LocalDateTime.now().isBefore(submission.getRound().getSubmissionDeadline())) {
            return "Scoring opens only after the submission deadline has passed";
        }
        if (SubmissionStatus.from(submission.getStatus()) == SubmissionStatus.ELIMINATED) {
            return "Eliminated submissions cannot be scored";
        }
        if (evaluation != null && "Finalized".equalsIgnoreCase(evaluation.getStatus())) {
            return "Finalized scores cannot be changed unless the coordinator reopens the evaluation";
        }
        return null;
    }

    private Map<Integer, Integer> criteriaCountsByRound(List<SubmissionEntity> submissions) {
        Set<Integer> roundIds = submissions.stream()
                .map(submission -> submission.getRound().getRoundId())
                .collect(Collectors.toSet());
        if (roundIds.isEmpty()) {
            return Map.of();
        }
        Map<Integer, Integer> counts = criteriaRepository.findByRoundRoundIdIn(roundIds).stream()
                .collect(Collectors.groupingBy(
                        criteria -> criteria.getRound().getRoundId(),
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));
        roundIds.forEach(roundId -> counts.putIfAbsent(roundId, 0));
        return counts;
    }

    private Map<Integer, List<ScoreEntity>> scoresBySubmissionForJudge(Integer judgeRoleId,
                                                                       List<SubmissionEntity> submissions) {
        Set<Integer> submissionIds = submissions.stream()
                .map(SubmissionEntity::getSubmissionId)
                .collect(Collectors.toSet());
        if (submissionIds.isEmpty()) {
            return Map.of();
        }
        return scoreRepository
                .findByJudgeAssignmentJudgeRoleUserRoleIdAndSubmissionSubmissionIdIn(judgeRoleId, submissionIds)
                .stream()
                .sorted(Comparator.comparing(score -> score.getCriteria().getCriteriaId()))
                .collect(Collectors.groupingBy(
                        score -> score.getSubmission().getSubmissionId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
    }

    private AssignedRoundDto toAssignedRoundDto(JudgeAssignmentEntity assignment,
                                                List<SubmissionEntity> submissions,
                                                Map<Integer, JudgeEvaluationEntity> evaluationsBySubmission,
                                                HackathonEventEntity event) {
        List<SubmissionEntity> matchingSubmissions = submissions.stream()
                .filter(submission -> submission.getRound().getRoundId().equals(assignment.getRound().getRoundId()))
                .filter(submission -> submission.getTeam().getTrack().getTrackId().equals(assignment.getTrack().getTrackId()))
                .toList();
        int scoredSubmissions = (int) matchingSubmissions.stream()
                .filter(submission -> {
                    JudgeEvaluationEntity evaluation = evaluationsBySubmission.get(submission.getSubmissionId());
                    return evaluation != null && "Finalized".equalsIgnoreCase(evaluation.getStatus());
                })
                .count();
        return new AssignedRoundDto(
                assignment.getJudgeAssignmentId(),
                assignment.getTrack().getEventId(),
                event == null ? null : event.getName(),
                assignment.getRound().getRoundId(),
                assignment.getRound().getRoundName(),
                assignment.getRound().getRoundOrder(),
                assignment.getRound().getSubmissionDeadline(),
                isRoundScoringLocked(assignment, event),
                assignment.getTrack().getTrackId(),
                assignment.getTrack().getName(),
                matchingSubmissions.size(),
                scoredSubmissions
        );
    }

    private EvaluationSubmissionDto toEvaluationSubmissionDto(SubmissionEntity submission,
                                                              Integer judgeRoleId,
                                                              List<ScoreEntity> currentJudgeScores,
                                                              int criteriaCount,
                                                              JudgeEvaluationEntity evaluation) {
        return toEvaluationSubmissionDto(
                submission,
                judgeRoleId,
                currentJudgeScores,
                criteriaCount,
                evaluation,
                eventFor(submission)
        );
    }

    private EvaluationSubmissionDto toEvaluationSubmissionDto(SubmissionEntity submission,
                                                              Integer judgeRoleId,
                                                              List<ScoreEntity> currentJudgeScores,
                                                              int criteriaCount,
                                                              JudgeEvaluationEntity evaluation,
                                                              HackathonEventEntity event) {
        String lockedReason = scoreLockedReason(submission, evaluation, event);
        int scoredCriteriaCount = (int) currentJudgeScores.stream()
                .map(score -> score.getCriteria().getCriteriaId())
                .distinct()
                .count();
        return new EvaluationSubmissionDto(
                submission.getSubmissionId(),
                event.getEventId(),
                event.getName(),
                event.getStatus(),
                submission.getTeam().getTeamId(),
                submission.getTeam().getTeamName(),
                submission.getTeam().getTrack().getTrackId(),
                submission.getTeam().getTrack().getName(),
                submission.getRound().getRoundId(),
                submission.getRound().getRoundName(),
                submission.getRound().getRoundOrder(),
                submission.getRound().getSubmissionDeadline(),
                Boolean.TRUE.equals(submission.getRound().getScoreLocked()),
                submission.getRepositoryUrl(),
                submission.getDemoUrl(),
                submission.getSlideUrl(),
                submission.getStatus(),
                submission.getSubmittedAt(),
                evaluation == null ? "NotStarted" : evaluation.getStatus(),
                judgeRoleId != null && evaluation != null && "Finalized".equalsIgnoreCase(evaluation.getStatus()),
                scoredCriteriaCount,
                criteriaCount,
                lockedReason == null
        );
    }

    private Map<Integer, HackathonEventEntity> eventsById(List<JudgeAssignmentEntity> assignments,
                                                          List<SubmissionEntity> submissions) {
        Set<Integer> eventIds = new HashSet<>();
        assignments.forEach(assignment -> eventIds.add(assignment.getTrack().getEventId()));
        submissions.forEach(submission -> eventIds.add(submission.getTeam().getTrack().getEventId()));
        if (eventIds.isEmpty()) {
            return Map.of();
        }
        return eventRepository.findAllById(eventIds).stream()
                .collect(Collectors.toMap(HackathonEventEntity::getEventId, Function.identity()));
    }

    private HackathonEventEntity eventFromMap(Map<Integer, HackathonEventEntity> eventsById, Integer eventId) {
        HackathonEventEntity event = eventsById.get(eventId);
        if (event == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Event not found");
        }
        return event;
    }

    private List<FeedbackDto> feedbackHistoryForViewer(Integer submissionId, UserRoleEntity viewerRole) {
        return feedbackRepository.findBySubmissionSubmissionIdOrderByCreatedAtDesc(submissionId)
                .stream()
                .filter(feedback -> canViewerSeeFeedback(feedback, viewerRole))
                .map(this::toFeedbackDto)
                .toList();
    }

    private boolean canViewerSeeFeedback(FeedbackEntity feedback, UserRoleEntity viewerRole) {
        if (viewerRole == null || viewerRole.getRoleType() == null) {
            return false;
        }
        if (RoleType.JUDGE.getDbValue().equalsIgnoreCase(viewerRole.getRoleType())) {
            return feedback.getAuthorRole() != null
                    && viewerRole.getUserRoleId().equals(feedback.getAuthorRole().getUserRoleId());
        }
        return true;
    }

    private boolean isRoundScoringLocked(JudgeAssignmentEntity assignment, HackathonEventEntity event) {
        if (Boolean.TRUE.equals(assignment.getRound().getScoreLocked())) {
            return true;
        }
        if (event != null && EventStatus.from(event.getStatus()).isTerminal()) {
            return true;
        }
        LocalDateTime deadline = assignment.getRound().getSubmissionDeadline();
        return deadline == null || LocalDateTime.now().isBefore(deadline);
    }

    private MentorTeamDto toMentorTeamDto(TeamEntity team, List<SubmissionEntity> submissions) {
        HackathonEventEntity event = eventRepository.findById(team.getTrack().getEventId()).orElse(null);
        List<EvaluationSubmissionDto> submissionDtos = submissions.stream()
                .sorted(Comparator.comparing(submission -> submission.getRound().getRoundOrder()))
                .map(submission -> toEvaluationSubmissionDto(submission, null, List.of(), 0, null))
                .toList();
        return new MentorTeamDto(
                team.getTeamId(),
                team.getTeamName(),
                team.getTrack().getTrackId(),
                team.getTrack().getName(),
                team.getTrack().getEventId(),
                event == null ? null : event.getName(),
                (int) teamMemberRepository.countByTeamTeamId(team.getTeamId()),
                team.getStatus(),
                submissionDtos
        );
    }

    private CriterionScoreDto toCriterionScoreDto(ScoringCriteriaEntity criteria, ScoreEntity score) {
        return new CriterionScoreDto(
                criteria.getCriteriaId(),
                criteria.getCriteriaName(),
                criteria.getWeight(),
                criteria.getCriteriaType(),
                score == null ? null : score.getScoreValue(),
                score == null ? null : score.getComment()
        );
    }

    private BigDecimal weightedTotal(List<ScoringCriteriaEntity> criteria,
                                     Map<Integer, ScoreEntity> scoreByCriteria) {
        return criteria.stream()
                .map(item -> {
                    ScoreEntity score = scoreByCriteria.get(item.getCriteriaId());
                    if (score == null || score.getScoreValue() == null) {
                        return BigDecimal.ZERO;
                    }
                    return score.getScoreValue()
                            .multiply(item.getWeight())
                            .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private void appendScoreHistory(JudgeEvaluationEntity evaluation,
                                    ScoringCriteriaEntity criteria,
                                    BigDecimal oldScoreValue,
                                    BigDecimal newScoreValue,
                                    String oldComment,
                                    String newComment,
                                    String actionType) {
        ScoreHistoryEntity history = new ScoreHistoryEntity();
        history.setEvaluation(evaluation);
        history.setCriteria(criteria);
        history.setOldScoreValue(oldScoreValue);
        history.setNewScoreValue(newScoreValue);
        history.setOldComment(oldComment);
        history.setNewComment(newComment);
        history.setActionType(actionType);
        scoreHistoryRepository.save(history);
    }

    private ScoreHistoryDto toScoreHistoryDto(ScoreHistoryEntity history) {
        return new ScoreHistoryDto(
                history.getScoreHistoryId(),
                history.getCriteria().getCriteriaId(),
                history.getCriteria().getCriteriaName(),
                history.getOldScoreValue(),
                history.getNewScoreValue(),
                history.getActionType(),
                history.getCreatedAt()
        );
    }

    private FeedbackDto toFeedbackDto(FeedbackEntity feedback) {
        UserRoleEntity authorRole = feedback.getAuthorRole();
        String authorName = authorRole == null || authorRole.getUser() == null
                ? "Unknown"
                : authorRole.getUser().getFullName();
        return new FeedbackDto(
                feedback.getFeedbackId(),
                feedback.getSubmission().getSubmissionId(),
                authorRole == null ? null : authorRole.getUserRoleId(),
                authorName,
                feedback.getAuthorRoleType(),
                feedback.getFeedbackText(),
                feedback.getCreatedAt()
        );
    }

    private HackathonEventEntity eventFor(SubmissionEntity submission) {
        return eventRepository.findById(submission.getTeam().getTrack().getEventId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    private String normalizeRequired(String value, String fieldName) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, fieldName + " is required");
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        return value.trim();
    }
}
