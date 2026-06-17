package com.seal.hackathon.evaluation.service;

import com.seal.hackathon.auth.entity.RoleType;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.auth.repository.UserRoleRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.evaluation.dto.AuditLogDto;
import com.seal.hackathon.evaluation.dto.CriteriaDefinitionDto;
import com.seal.hackathon.evaluation.dto.CriteriaDefinitionRequest;
import com.seal.hackathon.evaluation.dto.CriteriaTemplateDto;
import com.seal.hackathon.evaluation.dto.CriteriaTemplateRequest;
import com.seal.hackathon.evaluation.dto.FinalizationSubmissionDto;
import com.seal.hackathon.evaluation.dto.RoundCriteriaManagementDto;
import com.seal.hackathon.evaluation.dto.RoundCriteriaUpdateRequest;
import com.seal.hackathon.evaluation.dto.RoundFinalizationDto;
import com.seal.hackathon.evaluation.entity.AuditLogEntity;
import com.seal.hackathon.evaluation.entity.CriteriaTemplateEntity;
import com.seal.hackathon.evaluation.entity.CriteriaTemplateItemEntity;
import com.seal.hackathon.evaluation.entity.JudgeAssignmentEntity;
import com.seal.hackathon.evaluation.entity.JudgeEvaluationEntity;
import com.seal.hackathon.evaluation.entity.RankingEntity;
import com.seal.hackathon.evaluation.entity.ScoreEntity;
import com.seal.hackathon.evaluation.entity.ScoringCriteriaEntity;
import com.seal.hackathon.evaluation.repository.AuditLogRepository;
import com.seal.hackathon.evaluation.repository.CriteriaTemplateRepository;
import com.seal.hackathon.evaluation.repository.JudgeAssignmentRepository;
import com.seal.hackathon.evaluation.repository.JudgeEvaluationRepository;
import com.seal.hackathon.evaluation.repository.RankingRepository;
import com.seal.hackathon.evaluation.repository.ScoreRepository;
import com.seal.hackathon.evaluation.repository.ScoringCriteriaRepository;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.submission.entity.SubmissionEntity;
import com.seal.hackathon.submission.entity.SubmissionStatus;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import com.seal.hackathon.team.entity.TeamEntity;
import com.seal.hackathon.team.repository.TeamRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CoordinatorScoringService {

    private static final String TARGET_ENTITY_ROUND = "ROUND";
    private static final String TARGET_ENTITY_EVENT = "EVENT";
    private static final String TARGET_ENTITY_TRACK = "TRACK";
    private static final String TARGET_ENTITY_TEAM = "TEAM";
    private static final String TARGET_ENTITY_SUBMISSION = "SUBMISSION";
    private static final String TARGET_ENTITY_TEMPLATE = "CRITERIA_TEMPLATE";
    private static final List<CriteriaDefinitionDto> DEFAULT_QUALIFIER_CRITERIA = List.of(
            new CriteriaDefinitionDto(null, "Technical Quality", new BigDecimal("34.00"), "Technical Quality"),
            new CriteriaDefinitionDto(null, "Innovation", new BigDecimal("33.00"), "Innovation"),
            new CriteriaDefinitionDto(null, "Feasibility", new BigDecimal("33.00"), "Feasibility")
    );
    private static final List<CriteriaDefinitionDto> DEFAULT_FINAL_CRITERIA = List.of(
            new CriteriaDefinitionDto(null, "Presentation", new BigDecimal("25.00"), "Presentation"),
            new CriteriaDefinitionDto(null, "Q&A", new BigDecimal("25.00"), "Q&A"),
            new CriteriaDefinitionDto(null, "Product Demo", new BigDecimal("25.00"), "Product Demo"),
            new CriteriaDefinitionDto(null, "Business Impact", new BigDecimal("25.00"), "Business Impact")
    );

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final HackathonEventRepository eventRepository;
    private final RoundRepository roundRepository;
    private final TrackRepository trackRepository;
    private final TeamRepository teamRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoringCriteriaRepository criteriaRepository;
    private final CriteriaTemplateRepository criteriaTemplateRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final JudgeEvaluationRepository judgeEvaluationRepository;
    private final ScoreRepository scoreRepository;
    private final RankingRepository rankingRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditLogService auditLogService;

    public CoordinatorScoringService(UserRepository userRepository,
                                     UserRoleRepository userRoleRepository,
                                     HackathonEventRepository eventRepository,
                                     RoundRepository roundRepository,
                                     TrackRepository trackRepository,
                                     TeamRepository teamRepository,
                                     SubmissionRepository submissionRepository,
                                     ScoringCriteriaRepository criteriaRepository,
                                     CriteriaTemplateRepository criteriaTemplateRepository,
                                     JudgeAssignmentRepository judgeAssignmentRepository,
                                     JudgeEvaluationRepository judgeEvaluationRepository,
                                     ScoreRepository scoreRepository,
                                     RankingRepository rankingRepository,
                                     AuditLogRepository auditLogRepository,
                                     AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.eventRepository = eventRepository;
        this.roundRepository = roundRepository;
        this.trackRepository = trackRepository;
        this.teamRepository = teamRepository;
        this.submissionRepository = submissionRepository;
        this.criteriaRepository = criteriaRepository;
        this.criteriaTemplateRepository = criteriaTemplateRepository;
        this.judgeAssignmentRepository = judgeAssignmentRepository;
        this.judgeEvaluationRepository = judgeEvaluationRepository;
        this.scoreRepository = scoreRepository;
        this.rankingRepository = rankingRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public RoundCriteriaManagementDto getRoundCriteria(Authentication authentication, Integer roundId) {
        currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);
        return toRoundCriteriaDto(round);
    }

    @Transactional
    public RoundCriteriaManagementDto updateRoundCriteria(Authentication authentication,
                                                         Integer roundId,
                                                         RoundCriteriaUpdateRequest request) {
        UserEntity coordinator = currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);
        assertCriteriaEditable(round);

        List<CriteriaDefinitionRequest> normalizedCriteria = validateCriteriaDefinitions(request.criteria());
        List<CriteriaDefinitionDto> previousCriteria = criteriaRepository.findByRoundRoundIdOrderByCriteriaIdAsc(roundId)
                .stream()
                .map(this::toCriteriaDefinitionDto)
                .toList();

        criteriaRepository.deleteByRoundRoundId(roundId);
        persistRoundCriteria(round, normalizedCriteria);

        RoundCriteriaManagementDto updated = toRoundCriteriaDto(round);
        auditLogService.record(
                coordinator,
                "ROUND_CRITERIA_UPDATED",
                TARGET_ENTITY_ROUND,
                roundId,
                previousCriteria,
                updated.criteria(),
                "Updated scoring criteria and rubric weights for round " + round.getRoundName()
        );
        return updated;
    }

    @Transactional(readOnly = true)
    public List<CriteriaTemplateDto> listCriteriaTemplates(Authentication authentication) {
        currentCoordinator(authentication);
        return criteriaTemplateRepository.findAllByOrderByTemplateNameAsc()
                .stream()
                .map(this::toCriteriaTemplateDto)
                .toList();
    }

    @Transactional
    public CriteriaTemplateDto createCriteriaTemplate(Authentication authentication,
                                                      CriteriaTemplateRequest request) {
        UserEntity coordinator = currentCoordinator(authentication);
        List<CriteriaDefinitionRequest> normalizedCriteria = validateCriteriaDefinitions(request.criteria());
        String templateName = normalizeRequired(request.templateName(), "Template name");
        if (criteriaTemplateRepository.existsByTemplateNameIgnoreCase(templateName)) {
            throw new ApiException(HttpStatus.CONFLICT, "A criteria template with this name already exists");
        }

        CriteriaTemplateEntity template = new CriteriaTemplateEntity();
        template.setTemplateName(templateName);
        template.setDescription(normalizeOptional(request.description()));
        template.setCreatedBy(coordinator);
        template.setItems(buildTemplateItems(template, normalizedCriteria));

        CriteriaTemplateEntity saved = criteriaTemplateRepository.save(template);
        CriteriaTemplateDto dto = toCriteriaTemplateDto(saved);
        auditLogService.record(
                coordinator,
                "CRITERIA_TEMPLATE_CREATED",
                TARGET_ENTITY_TEMPLATE,
                saved.getTemplateId(),
                null,
                dto,
                "Created criteria template " + saved.getTemplateName()
        );
        return dto;
    }

    @Transactional
    public CriteriaTemplateDto updateCriteriaTemplate(Authentication authentication,
                                                      Integer templateId,
                                                      CriteriaTemplateRequest request) {
        UserEntity coordinator = currentCoordinator(authentication);
        CriteriaTemplateEntity template = getTemplateOrThrow(templateId);
        CriteriaTemplateDto previous = toCriteriaTemplateDto(template);
        List<CriteriaDefinitionRequest> normalizedCriteria = validateCriteriaDefinitions(request.criteria());
        String templateName = normalizeRequired(request.templateName(), "Template name");
        if (criteriaTemplateRepository.existsByTemplateNameIgnoreCaseAndTemplateIdNot(templateName, templateId)) {
            throw new ApiException(HttpStatus.CONFLICT, "A criteria template with this name already exists");
        }

        template.setTemplateName(templateName);
        template.setDescription(normalizeOptional(request.description()));
        template.getItems().clear();
        template.getItems().addAll(buildTemplateItems(template, normalizedCriteria));

        CriteriaTemplateEntity saved = criteriaTemplateRepository.save(template);
        CriteriaTemplateDto updated = toCriteriaTemplateDto(saved);
        auditLogService.record(
                coordinator,
                "CRITERIA_TEMPLATE_UPDATED",
                TARGET_ENTITY_TEMPLATE,
                saved.getTemplateId(),
                previous,
                updated,
                "Updated criteria template " + saved.getTemplateName()
        );
        return updated;
    }

    @Transactional
    public void deleteCriteriaTemplate(Authentication authentication, Integer templateId) {
        UserEntity coordinator = currentCoordinator(authentication);
        CriteriaTemplateEntity template = getTemplateOrThrow(templateId);
        CriteriaTemplateDto previous = toCriteriaTemplateDto(template);
        criteriaTemplateRepository.delete(template);
        auditLogService.record(
                coordinator,
                "CRITERIA_TEMPLATE_DELETED",
                TARGET_ENTITY_TEMPLATE,
                templateId,
                previous,
                null,
                "Deleted criteria template " + template.getTemplateName()
        );
    }

    @Transactional
    public RoundCriteriaManagementDto applyCriteriaTemplate(Authentication authentication,
                                                            Integer roundId,
                                                            Integer templateId) {
        UserEntity coordinator = currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);
        assertCriteriaEditable(round);
        CriteriaTemplateEntity template = getTemplateOrThrow(templateId);

        List<CriteriaDefinitionDto> previousCriteria = criteriaRepository.findByRoundRoundIdOrderByCriteriaIdAsc(roundId)
                .stream()
                .map(this::toCriteriaDefinitionDto)
                .toList();

        criteriaRepository.deleteByRoundRoundId(roundId);
        persistRoundCriteria(
                round,
                template.getItems().stream()
                        .sorted(Comparator.comparing(CriteriaTemplateItemEntity::getSortOrder))
                        .map(item -> new CriteriaDefinitionRequest(
                                null,
                                item.getCriteriaName(),
                                item.getWeight(),
                                item.getCriteriaType()
                        ))
                        .toList()
        );

        RoundCriteriaManagementDto updated = toRoundCriteriaDto(round);
        auditLogService.record(
                coordinator,
                "CRITERIA_TEMPLATE_APPLIED",
                TARGET_ENTITY_ROUND,
                roundId,
                previousCriteria,
                updated.criteria(),
                "Applied template " + template.getTemplateName() + " to round " + round.getRoundName()
        );
        return updated;
    }

    @Transactional(readOnly = true)
    public RoundFinalizationDto getRoundFinalization(Authentication authentication, Integer roundId) {
        currentCoordinator(authentication);
        return buildRoundFinalization(getRoundOrThrow(roundId));
    }

    @Transactional
    public RoundFinalizationDto finalizeRoundScores(Authentication authentication, Integer roundId) {
        UserEntity coordinator = currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);
        if (Boolean.TRUE.equals(round.getScoreLocked())) {
            throw new ApiException(HttpStatus.CONFLICT, "This round is already finalized and locked");
        }

        RoundFinalizationDto preview = buildRoundFinalization(round);
        if (!preview.canFinalize()) {
            throw new ApiException(HttpStatus.CONFLICT, preview.finalizationNote());
        }

        rankingRepository.deleteByRoundRoundId(roundId);
        List<SubmissionEntity> submissions = submissionRepository.findByRoundRoundIdOrderByTeamTeamNameAsc(roundId);
        Map<Integer, FinalizationSubmissionDto> previewBySubmissionId = preview.submissions().stream()
                .collect(Collectors.toMap(FinalizationSubmissionDto::submissionId, Function.identity()));

        List<RankingEntity> rankings = new ArrayList<>();
        for (SubmissionEntity submission : submissions) {
            FinalizationSubmissionDto item = previewBySubmissionId.get(submission.getSubmissionId());
            RankingEntity ranking = new RankingEntity();
            ranking.setRound(round);
            ranking.setTeam(submission.getTeam());
            ranking.setRankPosition(item.rankPosition());
            ranking.setTotalScore(item.totalScore());
            ranking.setQualifiedNextRound(item.qualifiedNextRound());
            rankings.add(ranking);

            submission.setStatus(item.qualifiedNextRound()
                    ? SubmissionStatus.QUALIFIED.getDbValue()
                    : SubmissionStatus.ELIMINATED.getDbValue());
        }

        rankingRepository.saveAll(rankings);
        submissionRepository.saveAll(submissions);
        round.setScoreLocked(true);
        roundRepository.save(round);

        auditLogService.record(
                coordinator,
                "ROUND_SCORING_FINALIZED",
                TARGET_ENTITY_ROUND,
                roundId,
                null,
                preview.submissions(),
                "Finalized scoring for round " + round.getRoundName()
        );
        return buildRoundFinalization(round);
    }

    @Transactional
    public RoundFinalizationDto reopenRoundFinalization(Authentication authentication, Integer roundId) {
        UserEntity coordinator = currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);
        if (!Boolean.TRUE.equals(round.getScoreLocked())) {
            throw new ApiException(HttpStatus.CONFLICT, "This round is not finalized yet");
        }

        List<RankingEntity> previousRankings = rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(roundId);
        List<SubmissionEntity> submissions = submissionRepository.findByRoundRoundIdOrderByTeamTeamNameAsc(roundId);
        for (SubmissionEntity submission : submissions) {
            submission.setStatus(SubmissionStatus.EVALUATING.getDbValue());
        }
        submissionRepository.saveAll(submissions);
        rankingRepository.deleteByRoundRoundId(roundId);
        round.setScoreLocked(false);
        roundRepository.save(round);

        auditLogService.record(
                coordinator,
                "ROUND_SCORING_REOPENED",
                TARGET_ENTITY_ROUND,
                roundId,
                previousRankings.stream().map(this::toRankingMap).toList(),
                null,
                "Reopened scoring for round " + round.getRoundName()
        );
        return buildRoundFinalization(round);
    }

    @Transactional(readOnly = true)
    public List<AuditLogDto> listAuditLogs(Authentication authentication,
                                           Integer eventId,
                                           Integer roundId,
                                           String actionType) {
        currentCoordinator(authentication);
        final String normalizedActionType = actionType == null ? null : actionType.trim();
        final AuditScope auditScope = buildAuditScope(eventId, roundId);

        return auditLogRepository.findTop300ByOrderByTimestampDesc().stream()
                .filter(log -> normalizedActionType == null || normalizedActionType.isBlank()
                        || log.getActionType().equalsIgnoreCase(normalizedActionType))
                .filter(log -> matchesAuditScope(log, auditScope))
                .map(this::toAuditLogDto)
                .toList();
    }

    private AuditScope buildAuditScope(Integer eventId, Integer roundId) {
        if (roundId != null) {
            RoundEntity round = getRoundOrThrow(roundId);
            Set<Integer> eventIds = new HashSet<>();
            if (round.getEventId() != null) {
                eventIds.add(round.getEventId());
            }
            Set<Integer> roundIds = new HashSet<>();
            roundIds.add(roundId);
            List<SubmissionEntity> roundSubmissions = submissionRepository.findByRoundRoundIdOrderByTeamTeamNameAsc(roundId);
            Set<Integer> submissionIds = roundSubmissions.stream()
                    .map(SubmissionEntity::getSubmissionId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            Set<Integer> teamIds = roundSubmissions.stream()
                    .map(SubmissionEntity::getTeam)
                    .filter(Objects::nonNull)
                    .map(TeamEntity::getTeamId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            Set<Integer> trackIds = roundSubmissions.stream()
                    .map(SubmissionEntity::getTeam)
                    .filter(Objects::nonNull)
                    .map(TeamEntity::getTrack)
                    .filter(Objects::nonNull)
                    .map(TrackEntity::getTrackId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            return new AuditScope(eventIds, roundIds, trackIds, teamIds, submissionIds);
        }
        if (eventId != null) {
            Set<Integer> roundIds = roundRepository.findByEventIdOrderByRoundOrderAsc(eventId).stream()
                    .map(RoundEntity::getRoundId)
                    .collect(Collectors.toSet());
            Set<Integer> trackIds = trackRepository.findByEventIdOrderByTrackIdAsc(eventId).stream()
                    .map(TrackEntity::getTrackId)
                    .collect(Collectors.toSet());
            Set<Integer> teamIds = new HashSet<>(teamRepository.findTeamIdsByEventId(eventId));
            Set<Integer> submissionIds = submissionRepository.findByEventId(eventId).stream()
                    .map(SubmissionEntity::getSubmissionId)
                    .collect(Collectors.toSet());
            return new AuditScope(Set.of(eventId), roundIds, trackIds, teamIds, submissionIds);
        }
        return AuditScope.emptyScope();
    }

    private boolean matchesAuditScope(AuditLogEntity log, AuditScope scope) {
        if (scope.isUnscoped()) {
            return true;
        }
        if (log.getTargetEntity() == null) {
            return false;
        }
        String normalizedTarget = log.getTargetEntity().trim().toUpperCase(Locale.ROOT);
        Integer targetId = log.getTargetId();
        return switch (normalizedTarget) {
            case TARGET_ENTITY_EVENT -> targetId != null && scope.eventIds().contains(targetId);
            case TARGET_ENTITY_ROUND -> targetId != null && scope.roundIds().contains(targetId);
            case TARGET_ENTITY_TRACK -> targetId != null && scope.trackIds().contains(targetId);
            case TARGET_ENTITY_TEAM -> targetId != null && scope.teamIds().contains(targetId);
            case TARGET_ENTITY_SUBMISSION -> targetId != null && scope.submissionIds().contains(targetId);
            default -> false;
        };
    }

    private RoundCriteriaManagementDto toRoundCriteriaDto(RoundEntity round) {
        HackathonEventEntity event = getEventOrThrow(round.getEventId());
        List<CriteriaDefinitionDto> storedCriteria = criteriaRepository.findByRoundRoundIdOrderByCriteriaIdAsc(round.getRoundId())
                .stream()
                .map(this::toCriteriaDefinitionDto)
                .toList();
        List<CriteriaDefinitionDto> criteria = storedCriteria.isEmpty()
                ? defaultCriteriaForRound(round)
                : storedCriteria;
        String lockedReason = criteriaEditLockedReason(round);
        BigDecimal totalWeight = criteria.stream()
                .map(CriteriaDefinitionDto::weight)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        return new RoundCriteriaManagementDto(
                event.getEventId(),
                event.getName(),
                round.getRoundId(),
                round.getRoundName(),
                round.getRoundOrder(),
                lockedReason == null,
                lockedReason,
                totalWeight,
                criteria
        );
    }

    private List<CriteriaDefinitionDto> defaultCriteriaForRound(RoundEntity round) {
        List<CriteriaDefinitionDto> source = Boolean.TRUE.equals(round.getFinalRound())
                ? DEFAULT_FINAL_CRITERIA
                : DEFAULT_QUALIFIER_CRITERIA;
        return source.stream()
                .map(item -> new CriteriaDefinitionDto(
                        null,
                        item.criteriaName(),
                        item.weight(),
                        item.criteriaType()
                ))
                .toList();
    }

    private CriteriaTemplateDto toCriteriaTemplateDto(CriteriaTemplateEntity template) {
        List<CriteriaDefinitionDto> criteria = template.getItems().stream()
                .sorted(Comparator.comparing(CriteriaTemplateItemEntity::getSortOrder))
                .map(item -> new CriteriaDefinitionDto(
                        null,
                        item.getCriteriaName(),
                        item.getWeight(),
                        item.getCriteriaType()
                ))
                .toList();
        BigDecimal totalWeight = criteria.stream()
                .map(CriteriaDefinitionDto::weight)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        return new CriteriaTemplateDto(
                template.getTemplateId(),
                template.getTemplateName(),
                template.getDescription(),
                template.getCreatedBy().getUserId(),
                template.getCreatedBy().getFullName(),
                template.getCreatedAt(),
                template.getUpdatedAt(),
                criteria.size(),
                totalWeight,
                criteria
        );
    }

    private RoundFinalizationDto buildRoundFinalization(RoundEntity round) {
        HackathonEventEntity event = getEventOrThrow(round.getEventId());
        List<ScoringCriteriaEntity> criteria = criteriaRepository.findByRoundRoundIdOrderByCriteriaIdAsc(round.getRoundId());
        List<SubmissionEntity> submissions = submissionRepository.findByRoundRoundIdOrderByTeamTeamNameAsc(round.getRoundId());
        List<JudgeAssignmentEntity> assignments = judgeAssignmentRepository.findByRoundRoundIdOrderByTrackAndJudge(round.getRoundId());
        List<JudgeEvaluationEntity> evaluations = judgeEvaluationRepository.findBySubmissionRoundRoundId(round.getRoundId());
        List<ScoreEntity> scores = scoreRepository.findBySubmissionRoundRoundId(round.getRoundId());
        List<RankingEntity> existingRankings = rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(round.getRoundId());

        Map<String, JudgeAssignmentEntity> assignmentByTrackJudge = assignments.stream()
                .collect(Collectors.toMap(
                        item -> item.getTrack().getTrackId() + ":" + item.getJudgeRole().getUserRoleId(),
                        Function.identity(),
                        (left, right) -> left
                ));
        Map<Integer, List<JudgeAssignmentEntity>> assignmentsByTrack = assignments.stream()
                .collect(Collectors.groupingBy(item -> item.getTrack().getTrackId()));
        Map<String, JudgeEvaluationEntity> evaluationBySubmissionAssignment = evaluations.stream()
                .collect(Collectors.toMap(
                        item -> item.getSubmission().getSubmissionId() + ":" + item.getJudgeAssignment().getJudgeAssignmentId(),
                        Function.identity(),
                        (left, right) -> left
                ));
        Map<String, List<ScoreEntity>> scoresBySubmissionAssignment = scores.stream()
                .collect(Collectors.groupingBy(
                        item -> item.getSubmission().getSubmissionId() + ":" + item.getJudgeAssignment().getJudgeAssignmentId()
                ));
        Map<Integer, RankingEntity> rankingByTeamId = existingRankings.stream()
                .collect(Collectors.toMap(item -> item.getTeam().getTeamId(), Function.identity(), (left, right) -> left));

        List<RoundSubmissionSnapshot> snapshots = new ArrayList<>();
        for (SubmissionEntity submission : submissions) {
            Integer trackId = submission.getTeam().getTrack().getTrackId();
            List<JudgeAssignmentEntity> trackAssignments = assignmentsByTrack.getOrDefault(trackId, List.of());
            int assignedJudgeCount = trackAssignments.size();
            int finalizedJudgeCount = 0;
            boolean allCriteriaScored = true;
            List<BigDecimal> judgeTotals = new ArrayList<>();

            if (assignedJudgeCount > 0 && !criteria.isEmpty()) {
                for (JudgeAssignmentEntity assignment : trackAssignments) {
                    JudgeEvaluationEntity evaluation = evaluationBySubmissionAssignment.get(
                            submission.getSubmissionId() + ":" + assignment.getJudgeAssignmentId()
                    );
                    if (evaluation == null || !"Finalized".equalsIgnoreCase(evaluation.getStatus())) {
                        continue;
                    }
                    finalizedJudgeCount += 1;
                    List<ScoreEntity> judgeScores = scoresBySubmissionAssignment.getOrDefault(
                            submission.getSubmissionId() + ":" + assignment.getJudgeAssignmentId(),
                            List.of()
                    );
                    if (!hasCompleteCriteriaScores(criteria, judgeScores)) {
                        allCriteriaScored = false;
                        continue;
                    }
                    judgeTotals.add(weightedTotal(criteria, judgeScores));
                }
            }

            boolean ready = !criteria.isEmpty()
                    && assignedJudgeCount > 0
                    && finalizedJudgeCount == assignedJudgeCount
                    && allCriteriaScored
                    && judgeTotals.size() == assignedJudgeCount;

            String readinessNote;
            if (criteria.isEmpty()) {
                readinessNote = "No criteria configured for this round";
            } else if (assignedJudgeCount == 0) {
                readinessNote = "No judges assigned for this track";
            } else if (finalizedJudgeCount < assignedJudgeCount) {
                readinessNote = "Waiting for all assigned judges to finalize their evaluations";
            } else if (!allCriteriaScored || judgeTotals.size() < assignedJudgeCount) {
                readinessNote = "One or more finalized evaluations still have incomplete criterion scores";
            } else {
                readinessNote = "Ready to finalize";
            }

            BigDecimal totalScore = ready
                    ? judgeTotals.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(judgeTotals.size()), 2, RoundingMode.HALF_UP)
                    : null;

            snapshots.add(new RoundSubmissionSnapshot(
                    submission,
                    assignedJudgeCount,
                    finalizedJudgeCount,
                    totalScore,
                    ready,
                    readinessNote
            ));
        }

        rankSnapshots(snapshots, round.getPromotionRuleTopN());
        List<FinalizationSubmissionDto> submissionDtos = snapshots.stream()
                .sorted(Comparator
                        .comparing((RoundSubmissionSnapshot item) -> item.submission.getTeam().getTrack().getName())
                        .thenComparing(item -> item.rankPosition == null ? Integer.MAX_VALUE : item.rankPosition)
                        .thenComparing(item -> item.submission.getTeam().getTeamName()))
                .map(item -> toFinalizationSubmissionDto(item, rankingByTeamId.get(item.submission.getTeam().getTeamId())))
                .toList();

        int readyCount = (int) snapshots.stream().filter(item -> item.ready).count();
        boolean canFinalize = !Boolean.TRUE.equals(round.getScoreLocked())
                && !criteria.isEmpty()
                && !submissions.isEmpty()
                && readyCount == submissions.size();

        String finalizationNote;
        if (Boolean.TRUE.equals(round.getScoreLocked())) {
            finalizationNote = "Scores are finalized and locked for this round.";
        } else if (criteria.isEmpty()) {
            finalizationNote = "Add scoring criteria before finalizing this round.";
        } else if (submissions.isEmpty()) {
            finalizationNote = "No submissions exist for this round yet.";
        } else if (readyCount < submissions.size()) {
            finalizationNote = "Every submission must have complete finalized judge evaluations before round finalization.";
        } else {
            finalizationNote = "All submissions are ready. Finalization will lock scoring and write rankings.";
        }

        LocalDateTime finalizedAt = existingRankings.stream()
                .map(RankingEntity::getCalculatedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        return new RoundFinalizationDto(
                event.getEventId(),
                event.getName(),
                round.getRoundId(),
                round.getRoundName(),
                round.getRoundOrder(),
                round.getPromotionRuleTopN(),
                Boolean.TRUE.equals(round.getScoreLocked()),
                criteria.size(),
                submissions.size(),
                readyCount,
                canFinalize,
                finalizationNote,
                finalizedAt,
                submissionDtos
        );
    }

    private void rankSnapshots(List<RoundSubmissionSnapshot> snapshots, Integer topN) {
        Map<Integer, List<RoundSubmissionSnapshot>> byTrack = snapshots.stream()
                .filter(item -> item.ready && item.totalScore != null)
                .collect(Collectors.groupingBy(item -> item.submission.getTeam().getTrack().getTrackId()));
        byTrack.values().forEach(items -> {
            items.sort(Comparator
                    .comparing((RoundSubmissionSnapshot item) -> item.totalScore, Comparator.reverseOrder())
                    .thenComparing(item -> item.submission.getSubmittedAt())
                    .thenComparing(item -> item.submission.getTeam().getTeamName(), String.CASE_INSENSITIVE_ORDER));
            for (int index = 0; index < items.size(); index += 1) {
                RoundSubmissionSnapshot item = items.get(index);
                item.rankPosition = index + 1;
                item.qualifiedNextRound = index < topN;
            }
        });
    }

    private boolean hasCompleteCriteriaScores(List<ScoringCriteriaEntity> criteria, List<ScoreEntity> scores) {
        Set<Integer> scoreCriteriaIds = scores.stream()
                .map(score -> score.getCriteria().getCriteriaId())
                .collect(Collectors.toSet());
        return criteria.stream().map(ScoringCriteriaEntity::getCriteriaId).allMatch(scoreCriteriaIds::contains);
    }

    private BigDecimal weightedTotal(List<ScoringCriteriaEntity> criteria, List<ScoreEntity> scores) {
        Map<Integer, ScoreEntity> scoresByCriteriaId = scores.stream()
                .collect(Collectors.toMap(score -> score.getCriteria().getCriteriaId(), Function.identity(), (left, right) -> left));
        return criteria.stream()
                .map(criteriaEntity -> {
                    ScoreEntity score = scoresByCriteriaId.get(criteriaEntity.getCriteriaId());
                    if (score == null || score.getScoreValue() == null) {
                        return BigDecimal.ZERO;
                    }
                    return score.getScoreValue()
                            .multiply(criteriaEntity.getWeight())
                            .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private List<CriteriaDefinitionRequest> validateCriteriaDefinitions(List<CriteriaDefinitionRequest> criteria) {
        if (criteria == null || criteria.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one criterion is required");
        }

        Set<String> names = new HashSet<>();
        BigDecimal totalWeight = BigDecimal.ZERO;
        List<CriteriaDefinitionRequest> normalized = new ArrayList<>();
        for (CriteriaDefinitionRequest item : criteria) {
            String name = normalizeRequired(item.criteriaName(), "Criterion name");
            String criteriaType = normalizeRequired(item.criteriaType(), "Criterion type");
            String normalizedNameKey = name.toLowerCase(Locale.ROOT);
            if (!names.add(normalizedNameKey)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Criterion names must be unique within a rubric");
            }
            BigDecimal weight = item.weight().setScale(2, RoundingMode.HALF_UP);
            totalWeight = totalWeight.add(weight);
            normalized.add(new CriteriaDefinitionRequest(item.criteriaId(), name, weight, criteriaType));
        }

        if (totalWeight.compareTo(BigDecimal.valueOf(100).setScale(2, RoundingMode.HALF_UP)) != 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Rubric weights must add up to exactly 100%");
        }
        return normalized;
    }

    private void persistRoundCriteria(RoundEntity round, Collection<CriteriaDefinitionRequest> criteria) {
        List<ScoringCriteriaEntity> entities = new ArrayList<>();
        for (CriteriaDefinitionRequest item : criteria) {
            ScoringCriteriaEntity entity = new ScoringCriteriaEntity();
            entity.setRound(round);
            entity.setCriteriaName(item.criteriaName().trim());
            entity.setWeight(item.weight().setScale(2, RoundingMode.HALF_UP));
            entity.setCriteriaType(item.criteriaType().trim());
            entities.add(entity);
        }
        criteriaRepository.saveAll(entities);
    }

    private List<CriteriaTemplateItemEntity> buildTemplateItems(CriteriaTemplateEntity template,
                                                                List<CriteriaDefinitionRequest> criteria) {
        List<CriteriaTemplateItemEntity> items = new ArrayList<>();
        for (int index = 0; index < criteria.size(); index += 1) {
            CriteriaDefinitionRequest item = criteria.get(index);
            CriteriaTemplateItemEntity entity = new CriteriaTemplateItemEntity();
            entity.setTemplate(template);
            entity.setCriteriaName(item.criteriaName().trim());
            entity.setWeight(item.weight().setScale(2, RoundingMode.HALF_UP));
            entity.setCriteriaType(item.criteriaType().trim());
            entity.setSortOrder(index + 1);
            items.add(entity);
        }
        return items;
    }

    private CriteriaDefinitionDto toCriteriaDefinitionDto(ScoringCriteriaEntity entity) {
        return new CriteriaDefinitionDto(
                entity.getCriteriaId(),
                entity.getCriteriaName(),
                entity.getWeight().setScale(2, RoundingMode.HALF_UP),
                entity.getCriteriaType()
        );
    }

    private FinalizationSubmissionDto toFinalizationSubmissionDto(RoundSubmissionSnapshot item,
                                                                  RankingEntity existingRanking) {
        TeamEntity team = item.submission.getTeam();
        Integer rankPosition = item.rankPosition != null
                ? item.rankPosition
                : existingRanking == null ? null : existingRanking.getRankPosition();
        boolean qualifiedNextRound = item.qualifiedNextRound != null
                ? item.qualifiedNextRound
                : existingRanking != null && Boolean.TRUE.equals(existingRanking.getQualifiedNextRound());
        BigDecimal totalScore = item.totalScore != null
                ? item.totalScore
                : existingRanking == null ? null : existingRanking.getTotalScore();
        return new FinalizationSubmissionDto(
                item.submission.getSubmissionId(),
                team.getTeamId(),
                team.getTeamName(),
                team.getTrack().getTrackId(),
                team.getTrack().getName(),
                item.submission.getRepositoryUrl(),
                item.submission.getStatus(),
                item.assignedJudgeCount,
                item.finalizedJudgeCount,
                totalScore,
                rankPosition,
                qualifiedNextRound,
                item.ready,
                item.readinessNote
        );
    }

    private AuditLogDto toAuditLogDto(AuditLogEntity entity) {
        UserEntity actor = entity.getUser();
        return new AuditLogDto(
                entity.getLogId(),
                actor == null ? null : actor.getUserId(),
                actor == null ? "System" : actor.getFullName(),
                actor == null ? null : actor.getUsername(),
                entity.getActionType(),
                entity.getTargetEntity(),
                entity.getTargetId(),
                entity.getTargetName(),
                entity.getOldValue(),
                entity.getNewValue(),
                entity.getReason(),
                entity.getTimestamp(),
                entity.getIpAddress(),
                entity.getDeviceInfo()
        );
    }

    private Map<String, Object> toRankingMap(RankingEntity entity) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("teamId", entity.getTeam().getTeamId());
        payload.put("teamName", entity.getTeam().getTeamName());
        payload.put("rankPosition", entity.getRankPosition());
        payload.put("totalScore", entity.getTotalScore());
        payload.put("qualifiedNextRound", entity.getQualifiedNextRound());
        return payload;
    }

    private void assertCriteriaEditable(RoundEntity round) {
        String lockedReason = criteriaEditLockedReason(round);
        if (lockedReason != null) {
            throw new ApiException(HttpStatus.CONFLICT, lockedReason);
        }
    }

    private String criteriaEditLockedReason(RoundEntity round) {
        if (Boolean.TRUE.equals(round.getScoreLocked())) {
            return "This round is finalized. Reopen score finalization before changing its rubric.";
        }
        if (scoreRepository.existsBySubmissionRoundRoundId(round.getRoundId())
                || judgeEvaluationRepository.existsBySubmissionRoundRoundId(round.getRoundId())) {
            return "Scoring has already started for this round, so criteria can no longer be changed.";
        }
        return null;
    }

    private CriteriaTemplateEntity getTemplateOrThrow(Integer templateId) {
        return criteriaTemplateRepository.findDetailedByTemplateId(templateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Criteria template not found"));
    }

    private RoundEntity getRoundOrThrow(Integer roundId) {
        return roundRepository.findById(roundId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round not found"));
    }

    private HackathonEventEntity getEventOrThrow(Integer eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    private UserEntity currentCoordinator(Authentication authentication) {
        if (authentication == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        UserEntity user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(user.getUserId(), RoleType.COORDINATOR.getDbValue())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Coordinator role is required"));
        return user;
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

    private static final class RoundSubmissionSnapshot {
        private final SubmissionEntity submission;
        private final int assignedJudgeCount;
        private final int finalizedJudgeCount;
        private final BigDecimal totalScore;
        private final boolean ready;
        private final String readinessNote;
        private Integer rankPosition;
        private Boolean qualifiedNextRound;

        private RoundSubmissionSnapshot(SubmissionEntity submission,
                                        int assignedJudgeCount,
                                        int finalizedJudgeCount,
                                        BigDecimal totalScore,
                                        boolean ready,
                                        String readinessNote) {
            this.submission = submission;
            this.assignedJudgeCount = assignedJudgeCount;
            this.finalizedJudgeCount = finalizedJudgeCount;
            this.totalScore = totalScore;
            this.ready = ready;
            this.readinessNote = readinessNote;
        }
    }

    private record AuditScope(
            Set<Integer> eventIds,
            Set<Integer> roundIds,
            Set<Integer> trackIds,
            Set<Integer> teamIds,
            Set<Integer> submissionIds
    ) {
        private static AuditScope emptyScope() {
            return new AuditScope(Set.of(), Set.of(), Set.of(), Set.of(), Set.of());
        }

        private boolean isUnscoped() {
            return eventIds.isEmpty()
                    && roundIds.isEmpty()
                    && trackIds.isEmpty()
                    && teamIds.isEmpty()
                    && submissionIds.isEmpty();
        }
    }
}
