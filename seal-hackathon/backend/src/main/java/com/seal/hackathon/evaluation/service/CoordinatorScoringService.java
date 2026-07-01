package com.seal.hackathon.evaluation.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seal.hackathon.auth.entity.RoleType;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.auth.repository.UserRoleRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.evaluation.dto.AuditLogDto;
import com.seal.hackathon.evaluation.dto.AwardRecommendationSummaryDto;
import com.seal.hackathon.evaluation.dto.AwardSelectionRequest;
import com.seal.hackathon.evaluation.dto.CalibrationAnalyticsDto;
import com.seal.hackathon.evaluation.dto.CalibrationScoreDto;
import com.seal.hackathon.evaluation.dto.CalibrationScoreRequest;
import com.seal.hackathon.evaluation.dto.CalibrationSessionDto;
import com.seal.hackathon.evaluation.dto.CalibrationSessionRequest;
import com.seal.hackathon.evaluation.dto.CriteriaDefinitionDto;
import com.seal.hackathon.evaluation.dto.CriteriaDefinitionRequest;
import com.seal.hackathon.evaluation.dto.CriteriaTemplateDto;
import com.seal.hackathon.evaluation.dto.CriteriaTemplateRequest;
import com.seal.hackathon.evaluation.dto.CriterionVarianceDto;
import com.seal.hackathon.evaluation.dto.FinalizationSubmissionDto;
import com.seal.hackathon.evaluation.dto.ManualEliminationRequest;
import com.seal.hackathon.evaluation.dto.RoundCriteriaManagementDto;
import com.seal.hackathon.evaluation.dto.RoundCriteriaUpdateRequest;
import com.seal.hackathon.evaluation.dto.RoundFinalizationDto;
import com.seal.hackathon.evaluation.dto.ResearchDatasetRowProjection;
import com.seal.hackathon.evaluation.dto.ResultPublicationDto;
import com.seal.hackathon.evaluation.dto.ScoreVarianceDashboardDto;
import com.seal.hackathon.evaluation.dto.TeamCriterionVarianceDto;
import com.seal.hackathon.evaluation.entity.AuditLogEntity;
import com.seal.hackathon.evaluation.entity.CalibrationScoreEntity;
import com.seal.hackathon.evaluation.entity.CalibrationSessionEntity;
import com.seal.hackathon.evaluation.entity.CriteriaTemplateEntity;
import com.seal.hackathon.evaluation.entity.CriteriaTemplateItemEntity;
import com.seal.hackathon.evaluation.entity.JudgeAssignmentEntity;
import com.seal.hackathon.evaluation.entity.JudgeEvaluationEntity;
import com.seal.hackathon.evaluation.entity.RankingEntity;
import com.seal.hackathon.evaluation.entity.RankingQualificationStatus;
import com.seal.hackathon.evaluation.entity.ScoreEntity;
import com.seal.hackathon.evaluation.entity.ScoringCriteriaEntity;
import com.seal.hackathon.evaluation.repository.AuditLogRepository;
import com.seal.hackathon.evaluation.repository.CalibrationScoreRepository;
import com.seal.hackathon.evaluation.repository.CalibrationSessionRepository;
import com.seal.hackathon.evaluation.repository.CriteriaTemplateRepository;
import com.seal.hackathon.evaluation.repository.JudgeAssignmentRepository;
import com.seal.hackathon.evaluation.repository.JudgeEvaluationRepository;
import com.seal.hackathon.evaluation.repository.RankingRepository;
import com.seal.hackathon.evaluation.repository.ScoreRepository;
import com.seal.hackathon.evaluation.repository.ScoringCriteriaRepository;
import com.seal.hackathon.event.dto.EventWizardAwardRequest;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.event.service.EventUpdateNotificationService;
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
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CoordinatorScoringService {

    private static final int DISQUALIFIED_RANK_BASE = 1_000_000;
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
    private final EventUpdateNotificationService notificationService;
    private final CalibrationSessionRepository calibrationSessionRepository;
    private final CalibrationScoreRepository calibrationScoreRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

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
                                     AuditLogService auditLogService,
                                     EventUpdateNotificationService notificationService,
                                     CalibrationSessionRepository calibrationSessionRepository,
                                     CalibrationScoreRepository calibrationScoreRepository) {
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
        this.notificationService = notificationService;
        this.calibrationSessionRepository = calibrationSessionRepository;
        this.calibrationScoreRepository = calibrationScoreRepository;
    }

    @Transactional(readOnly = true)
    public List<CalibrationSessionDto> listCalibrationSessions(Authentication authentication, Integer roundId) {
        currentUserWithAnyScoringRole(authentication);
        getRoundOrThrow(roundId);
        return calibrationSessionRepository.findByRoundRoundIdOrderByCreatedAtDesc(roundId)
                .stream()
                .map(this::toCalibrationSessionDto)
                .toList();
    }

    @Transactional
    public CalibrationSessionDto createCalibrationSession(Authentication authentication,
                                                          Integer roundId,
                                                          CalibrationSessionRequest request) {
        currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);
        CalibrationSessionEntity session = new CalibrationSessionEntity();
        session.setRound(round);
        session.setTitle(normalizeRequired(request.title(), "Session title"));
        session.setStatus(normalizeOptional(request.status()));
        session.setCreatedAt(LocalDateTime.now());
        return toCalibrationSessionDto(calibrationSessionRepository.save(session));
    }

    @Transactional
    public CalibrationSessionDto upsertCalibrationScore(Authentication authentication,
                                                        Integer sessionId,
                                                        CalibrationScoreRequest request) {
        currentUserWithAnyScoringRole(authentication);
        CalibrationSessionEntity session = calibrationSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Calibration session not found"));
        SubmissionEntity submission = submissionRepository.findDetailedById(request.submissionId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Submission not found"));
        ScoringCriteriaEntity criteria = criteriaRepository.findById(request.criteriaId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Criterion not found"));
        JudgeAssignmentEntity assignment = judgeAssignmentRepository.findById(request.judgeAssignmentId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Judge assignment not found"));

        CalibrationScoreEntity score = new CalibrationScoreEntity();
        score.setSession(session);
        score.setSubmission(submission);
        score.setCriteria(criteria);
        score.setJudgeAssignment(assignment);
        score.setScoreValue(request.scoreValue().setScale(2, RoundingMode.HALF_UP));
        score.setComment(normalizeOptional(request.comment()));
        score.setScoredAt(LocalDateTime.now());
        calibrationScoreRepository.save(score);
        return toCalibrationSessionDto(session);
    }

    @Transactional(readOnly = true)
    public CalibrationAnalyticsDto getCalibrationAnalytics(Authentication authentication, Integer sessionId) {
        currentUserWithAnyScoringRole(authentication);
        CalibrationSessionEntity session = calibrationSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Calibration session not found"));
        List<CalibrationScoreEntity> scores = calibrationScoreRepository.findBySessionSessionIdOrderByScoredAtDesc(sessionId);
        List<CalibrationScoreDto> scoreDtos = scores.stream().map(this::toCalibrationScoreDto).toList();
        BigDecimal average = scoreDtos.isEmpty() ? BigDecimal.ZERO : scoreDtos.stream()
                .map(CalibrationScoreDto::scoreValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(scoreDtos.size()), 2, RoundingMode.HALF_UP);
        BigDecimal min = scoreDtos.isEmpty() ? BigDecimal.ZERO : scoreDtos.stream()
                .map(CalibrationScoreDto::scoreValue)
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
        BigDecimal max = scoreDtos.isEmpty() ? BigDecimal.ZERO : scoreDtos.stream()
                .map(CalibrationScoreDto::scoreValue)
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
        return new CalibrationAnalyticsDto(session.getSessionId(), scoreDtos.size(), average, min, max, scoreDtos);
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

    @Transactional(readOnly = true)
    public AwardRecommendationSummaryDto generateAwardRecommendations(Authentication authentication, Integer roundId) {
        currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);
        HackathonEventEntity event = getEventOrThrow(round.getEventId());
        List<RankingEntity> rankings = rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(roundId);
        List<AwardRecommendationSummaryDto.AwardRecommendationDto> awardDtos = new ArrayList<>();

        List<com.seal.hackathon.event.dto.EventWizardAwardRequest> configuredAwards = readAwards(event.getAwardsJson());
        if (configuredAwards.isEmpty()) {
            return new AwardRecommendationSummaryDto(false, List.of());
        }

        List<RankingEntity> eligibleRankings = rankings.stream()
                .filter(item -> {
                    if (item.getRankPosition() == null || item.getRankPosition() <= 0) {
                        return false;
                    }
                    try {
                        RankingQualificationStatus status = RankingQualificationStatus.from(item.getQualificationStatus());
                        return status != RankingQualificationStatus.DISQUALIFIED;
                    } catch (IllegalArgumentException ex) {
                        return true;
                    }
                })
                .sorted(Comparator.comparing(RankingEntity::getRankPosition, Comparator.nullsLast(Integer::compareTo)))
                .toList();

        int nextEligibleIndex = 0;
        for (com.seal.hackathon.event.dto.EventWizardAwardRequest award : configuredAwards) {
            List<AwardRecommendationSummaryDto.AwardWinnerDto> winners = new ArrayList<>();
            int quantity = Math.max(1, award.quantity() == null ? 1 : award.quantity());
            for (int slot = 0; slot < quantity && nextEligibleIndex < eligibleRankings.size(); slot += 1) {
                RankingEntity ranking = eligibleRankings.get(nextEligibleIndex);
                nextEligibleIndex += 1;
                winners.add(new AwardRecommendationSummaryDto.AwardWinnerDto(
                        ranking.getTeam().getTeamId(),
                        ranking.getTeam().getTeamName(),
                        ranking.getRankPosition(),
                        ranking.getTotalScore(),
                        ranking.getQualificationStatus()
                ));
            }
            awardDtos.add(new AwardRecommendationSummaryDto.AwardRecommendationDto(
                    award.awardName(),
                    quantity,
                    winners,
                    List.of()
            ));
        }

        return new AwardRecommendationSummaryDto(Boolean.TRUE.equals(round.getScoreLocked()), awardDtos);
    }

    @Transactional
    public AwardRecommendationSummaryDto confirmAwardRecommendations(Authentication authentication,
                                                                     Integer roundId,
                                                                     List<AwardSelectionRequest> selections) {
        currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);
        HackathonEventEntity event = getEventOrThrow(round.getEventId());

        List<EventWizardAwardRequest> configuredAwards = readAwards(event.getAwardsJson());
        if (configuredAwards.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one award must be configured before confirming winners.");
        }

        Map<String, List<Integer>> selectedByAward = selections == null ? Map.of() : selections.stream()
                .filter(selection -> selection != null && selection.awardName() != null && !selection.awardName().isBlank())
                .collect(Collectors.toMap(
                        AwardSelectionRequest::awardName,
                        selection -> selection.winnerTeamIds() == null ? List.of() : selection.winnerTeamIds().stream().filter(Objects::nonNull).toList(),
                        (left, right) -> right,
                        LinkedHashMap::new
                ));

        List<AwardRecommendationSummaryDto.AwardRecommendationDto> updatedAwards = new ArrayList<>();
        List<RankingEntity> rankings = rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(roundId);
        Map<Integer, RankingEntity> rankingByTeamId = rankings.stream()
                .filter(ranking -> ranking.getTeam() != null)
                .collect(Collectors.toMap(ranking -> ranking.getTeam().getTeamId(), Function.identity(), (left, right) -> left, LinkedHashMap::new));

        for (EventWizardAwardRequest award : configuredAwards) {
            List<Integer> selectedWinnerTeamIds = selectedByAward.getOrDefault(award.awardName(), List.of());
            List<AwardRecommendationSummaryDto.AwardWinnerDto> winners = new ArrayList<>();
            for (Integer teamId : selectedWinnerTeamIds) {
                RankingEntity ranking = rankingByTeamId.get(teamId);
                if (ranking == null || ranking.getTeam() == null) {
                    continue;
                }
                winners.add(new AwardRecommendationSummaryDto.AwardWinnerDto(
                        ranking.getTeam().getTeamId(),
                        ranking.getTeam().getTeamName(),
                        ranking.getRankPosition(),
                        ranking.getTotalScore(),
                        ranking.getQualificationStatus()
                ));
            }
            updatedAwards.add(new AwardRecommendationSummaryDto.AwardRecommendationDto(
                    award.awardName(),
                    Math.max(1, award.quantity() == null ? 1 : award.quantity()),
                    winners,
                    selectedWinnerTeamIds
            ));
        }

        event.setAwardsJson(writeAwardSelectionSummary(event.getAwardsJson(), updatedAwards));
        eventRepository.save(event);
        auditLogService.record(
                currentCoordinator(authentication),
                "AWARD_SELECTION_CONFIRMED",
                TARGET_ENTITY_EVENT,
                round.getEventId(),
                null,
                updatedAwards.stream().map(award -> award.awardName() + "=" + award.selectedWinnerTeamIds()).toList(),
                "Confirmed award winners for round " + roundId
        );

        return new AwardRecommendationSummaryDto(Boolean.TRUE.equals(round.getScoreLocked()), updatedAwards);
    }

    @Transactional(readOnly = true)
    public ResultPublicationDto getResultPublicationStatus(Authentication authentication, Integer eventId) {
        currentCoordinator(authentication);
        HackathonEventEntity event = getEventOrThrow(eventId);
        RoundEntity finalRound = resolveFinalRound(eventId);
        int rankingCount = finalRound == null
                ? 0
                : rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(finalRound.getRoundId()).size();
        return toResultPublicationDto(
                event,
                finalRound,
                rankingCount,
                0,
                isResultPublished(event)
                        ? "Final results have already been published."
                        : "Final results are not published yet."
        );
    }

    @Transactional
    public ResultPublicationDto publishEventResults(Authentication authentication, Integer eventId) {
        UserEntity coordinator = currentCoordinator(authentication);
        HackathonEventEntity event = getEventOrThrow(eventId);
        RoundEntity finalRound = resolveFinalRound(eventId);
        if (finalRound == null) {
            throw new ApiException(HttpStatus.CONFLICT, "Configure at least one round before publishing results");
        }

        List<RankingEntity> rankings = rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(finalRound.getRoundId());
        if (isResultPublished(event)) {
            return toResultPublicationDto(
                    event,
                    finalRound,
                    rankings.size(),
                    0,
                    "Final results have already been published."
            );
        }

        RoundFinalizationDto finalization = buildRoundFinalization(finalRound);
        if (!finalization.scoreLocked()) {
            throw new ApiException(HttpStatus.CONFLICT, "Finalize the final round before publishing event results");
        }
        if (finalization.totalSubmissions() == null || finalization.totalSubmissions() == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "No final-round submissions are available to publish");
        }
        if (!hasCompleteRankingSnapshot(rankings, findCompetitionSubmissions(finalRound.getRoundId()))) {
            throw new ApiException(HttpStatus.CONFLICT, "Final-round ranking snapshot is incomplete");
        }

        Map<String, Object> previous = new LinkedHashMap<>();
        previous.put("status", event.getStatus());
        previous.put("publishedAt", event.getPublishedAt());

        event.setStatus("Ended");
        event.setPublishedAt(LocalDateTime.now());
        HackathonEventEntity savedEvent = eventRepository.save(event);
        int notificationCount = notificationService.notifyResultsPublished(savedEvent);

        Map<String, Object> updated = new LinkedHashMap<>();
        updated.put("status", savedEvent.getStatus());
        updated.put("publishedAt", savedEvent.getPublishedAt());
        updated.put("finalRoundId", finalRound.getRoundId());
        updated.put("publishedRankingCount", rankings.size());
        updated.put("notificationCount", notificationCount);

        auditLogService.record(
                coordinator,
                "RESULTS_PUBLISHED",
                TARGET_ENTITY_EVENT,
                eventId,
                previous,
                updated,
                "Published final results for " + savedEvent.getName()
        );

        return toResultPublicationDto(
                savedEvent,
                finalRound,
                rankings.size(),
                notificationCount,
                "Final results published and participants notified."
        );
    }

    @Transactional(readOnly = true)
    public String exportRankingReportCsv(Authentication authentication, Integer roundId, Integer trackId) {
        currentCoordinator(authentication);
        RoundFinalizationDto finalization = buildReportableRoundFinalization(roundId, trackId);
        StringBuilder csv = new StringBuilder();
        appendCsvRow(csv, rankingReportHeaders());
        for (FinalizationSubmissionDto item : filterReportRows(finalization, trackId)) {
            appendCsvRow(csv, rankingReportValues(finalization, item));
        }
        return csv.toString();
    }

    @Transactional(readOnly = true)
    public String exportRankingReportExcelHtml(Authentication authentication, Integer roundId, Integer trackId) {
        currentCoordinator(authentication);
        RoundFinalizationDto finalization = buildReportableRoundFinalization(roundId, trackId);
        StringBuilder html = new StringBuilder();
        html.append("<html><head><meta charset=\"UTF-8\"></head><body>");
        html.append("<h2>").append(escapeHtml(finalization.eventName())).append("</h2>");
        html.append("<p>Round: ").append(escapeHtml(finalization.roundName())).append("</p>");
        html.append("<table border=\"1\"><thead><tr>");
        for (String header : rankingReportHeaders()) {
            html.append("<th>").append(escapeHtml(header)).append("</th>");
        }
        html.append("</tr></thead><tbody>");
        for (FinalizationSubmissionDto item : filterReportRows(finalization, trackId)) {
            html.append("<tr>");
            for (String value : rankingReportValues(finalization, item)) {
                html.append("<td>").append(escapeHtml(value)).append("</td>");
            }
            html.append("</tr>");
        }
        html.append("</tbody></table></body></html>");
        return html.toString();
    }

    @Transactional(readOnly = true)
    public ScoreVarianceDashboardDto getScoreVarianceDashboard(Authentication authentication,
                                                               Integer roundId,
                                                               Integer trackId,
                                                               boolean includeCalibration) {
        currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);
        HackathonEventEntity event = getEventOrThrow(round.getEventId());
        TrackEntity selectedTrack = null;
        if (trackId != null) {
            selectedTrack = trackRepository.findById(trackId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Track not found"));
            if (!Objects.equals(selectedTrack.getEventId(), round.getEventId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Track does not belong to the selected round event");
            }
        }

        List<ResearchDatasetRowProjection> rows = scoreRepository.findResearchDatasetRows(
                roundId,
                trackId,
                includeCalibration
        );
        Map<Integer, FinalizationSubmissionDto> submissionsById = buildRoundFinalization(round)
                .submissions()
                .stream()
                .collect(Collectors.toMap(FinalizationSubmissionDto::submissionId, Function.identity(), (left, right) -> left));

        Map<String, VarianceBucket> buckets = new LinkedHashMap<>();
        Map<Integer, CriterionVarianceAccumulator> criteria = new LinkedHashMap<>();
        Set<Integer> scoredSubmissionIds = new HashSet<>();
        Set<Integer> judgeAssignmentIds = new HashSet<>();

        for (ResearchDatasetRowProjection row : rows) {
            if (row.getScoreValue() == null || row.getCriteriaId() == null || row.getSubmissionId() == null) {
                continue;
            }
            double scoreValue = row.getScoreValue().doubleValue();
            scoredSubmissionIds.add(row.getSubmissionId());
            if (row.getJudgeAssignmentId() != null) {
                judgeAssignmentIds.add(row.getJudgeAssignmentId());
            }

            CriterionVarianceAccumulator accumulator = criteria.computeIfAbsent(
                    row.getCriteriaId(),
                    ignored -> new CriterionVarianceAccumulator(row)
            );
            accumulator.addScore(scoreValue, row.getJudgeAssignmentId());

            String bucketKey = row.getSubmissionId() + ":" + row.getCriteriaId();
            VarianceBucket bucket = buckets.computeIfAbsent(
                    bucketKey,
                    ignored -> new VarianceBucket(row, submissionsById.get(row.getSubmissionId()))
            );
            bucket.add(scoreValue);
        }

        List<TeamCriterionVarianceDto> teamCriteria = buckets.values().stream()
                .filter(VarianceBucket::hasComparableScores)
                .map(VarianceBucket::toDto)
                .sorted(Comparator
                        .comparing(TeamCriterionVarianceDto::trackName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(TeamCriterionVarianceDto::teamName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(TeamCriterionVarianceDto::criteriaName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();

        for (VarianceBucket bucket : buckets.values()) {
            CriterionVarianceAccumulator accumulator = criteria.get(bucket.criteriaId);
            if (accumulator != null && bucket.hasComparableScores()) {
                accumulator.addBucket(bucket);
            }
        }

        List<CriterionVarianceDto> criterionDtos = criteria.values().stream()
                .map(CriterionVarianceAccumulator::toDto)
                .sorted(Comparator.comparing(CriterionVarianceDto::averageVariance, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        Double averageVariance = average(
                criterionDtos.stream()
                        .map(CriterionVarianceDto::averageVariance)
                        .filter(Objects::nonNull)
                        .toList()
        );
        Optional<CriterionVarianceDto> highestVarianceCriterion = criterionDtos.stream()
                .filter(item -> item.averageVariance() != null)
                .max(Comparator.comparing(CriterionVarianceDto::averageVariance));

        return new ScoreVarianceDashboardDto(
                event.getEventId(),
                event.getName(),
                round.getRoundId(),
                round.getRoundName(),
                selectedTrack == null ? null : selectedTrack.getTrackId(),
                selectedTrack == null ? null : selectedTrack.getName(),
                includeCalibration,
                criteria.size(),
                scoredSubmissionIds.size(),
                judgeAssignmentIds.size(),
                rows.size(),
                roundDouble(averageVariance),
                highestVarianceCriterion.map(item -> roundDouble(item.averageVariance())).orElse(null),
                highestVarianceCriterion.map(CriterionVarianceDto::criteriaName).orElse(null),
                criterionDtos,
                teamCriteria
        );
    }

    @Transactional
    public String exportAnonymizedScoringDatasetCsv(Authentication authentication,
                                                    Integer roundId,
                                                    Integer trackId,
                                                    boolean includeCalibration) {
        UserEntity coordinator = currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);
        HackathonEventEntity event = getEventOrThrow(round.getEventId());
        if (trackId != null) {
            TrackEntity track = trackRepository.findById(trackId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Track not found"));
            if (!Objects.equals(track.getEventId(), round.getEventId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Track does not belong to the selected round event");
            }
        }
        List<ResearchDatasetRowProjection> rows = scoreRepository.findResearchDatasetRows(
                roundId,
                trackId,
                includeCalibration
        );

        StringBuilder csv = new StringBuilder();
        appendCsvRow(csv, List.of(
                "event_code",
                "event_semester",
                "event_year",
                "round_code",
                "round_order",
                "round_name",
                "track_code",
                "track_name",
                "team_code",
                "submission_code",
                "submission_status",
                "is_calibration",
                "judge_code",
                "criteria_code",
                "criteria_name",
                "criteria_type",
                "criteria_weight",
                "score_value",
                "submitted_at",
                "scored_at"
        ));

        for (ResearchDatasetRowProjection row : rows) {
            appendCsvRow(csv, List.of(
                    anonymizedCode("EVENT", row.getEventId()),
                    stringValue(row.getEventSemester()),
                    stringValue(row.getEventYear()),
                    anonymizedCode("ROUND", row.getRoundId()),
                    stringValue(row.getRoundOrder()),
                    stringValue(row.getRoundName()),
                    anonymizedCode("TRACK", row.getTrackId()),
                    stringValue(row.getTrackName()),
                    anonymizedCode("TEAM", row.getTeamId()),
                    anonymizedCode("SUBMISSION", row.getSubmissionId()),
                    stringValue(row.getSubmissionStatus()),
                    stringValue(row.getCalibration()),
                    anonymizedCode("JUDGE_ASSIGNMENT", row.getJudgeAssignmentId()),
                    anonymizedCode("CRITERIA", row.getCriteriaId()),
                    stringValue(row.getCriteriaName()),
                    stringValue(row.getCriteriaType()),
                    stringValue(row.getCriteriaWeight()),
                    stringValue(row.getScoreValue()),
                    stringValue(row.getSubmittedAt()),
                    stringValue(row.getScoredAt())
            ));
        }

        Map<String, Object> exportAuditPayload = new LinkedHashMap<>();
        exportAuditPayload.put("roundId", roundId);
        exportAuditPayload.put("eventId", event.getEventId());
        exportAuditPayload.put("trackId", trackId);
        exportAuditPayload.put("includeCalibration", includeCalibration);
        exportAuditPayload.put("rowCount", rows.size());

        auditLogService.record(
                coordinator,
                "ANONYMIZED_SCORING_DATASET_EXPORTED",
                TARGET_ENTITY_ROUND,
                roundId,
                null,
                exportAuditPayload,
                "Exported anonymized criterion-level scoring dataset for research analysis"
        );
        return csv.toString();
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

        List<RankingEntity> existingRankings = rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(roundId);
        Map<Integer, RankingEntity> disqualifiedRankingsByTeamId = existingRankings.stream()
                .filter(item -> RankingQualificationStatus.from(item.getQualificationStatus()) == RankingQualificationStatus.DISQUALIFIED)
                .collect(Collectors.toMap(item -> item.getTeam().getTeamId(), Function.identity(), (left, right) -> left));
        rankingRepository.deleteByRoundRoundId(roundId);
        List<SubmissionEntity> submissions = findCompetitionSubmissions(roundId);
        Map<Integer, FinalizationSubmissionDto> previewBySubmissionId = preview.submissions().stream()
                .collect(Collectors.toMap(FinalizationSubmissionDto::submissionId, Function.identity()));

        List<RankingEntity> rankings = new ArrayList<>();
        for (SubmissionEntity submission : submissions) {
            FinalizationSubmissionDto item = previewBySubmissionId.get(submission.getSubmissionId());
            RankingEntity disqualifiedRanking = disqualifiedRankingsByTeamId.get(submission.getTeam().getTeamId());
            RankingEntity ranking = new RankingEntity();
            ranking.setRound(round);
            ranking.setTeam(submission.getTeam());
            ranking.setRankPosition(disqualifiedRanking == null
                    ? item.rankPosition()
                    : disqualifiedRanking.getRankPosition());
            ranking.setTotalScore(item.totalScore() != null
                    ? item.totalScore()
                    : disqualifiedRanking == null ? BigDecimal.ZERO : disqualifiedRanking.getTotalScore());
            ranking.setQualifiedNextRound(false);
            if (disqualifiedRanking != null) {
                ranking.setQualificationStatus(RankingQualificationStatus.DISQUALIFIED.getDbValue());
                ranking.setQualificationNote(disqualifiedRanking.getQualificationNote());
                ranking.setQualificationCalculatedAt(disqualifiedRanking.getQualificationCalculatedAt());
            } else {
                ranking.setQualificationStatus(resolvePersistedQualificationStatus(round).getDbValue());
                ranking.setQualificationNote(item.qualificationNote());
                ranking.setQualificationCalculatedAt(null);
            }
            rankings.add(ranking);
        }

        rankingRepository.saveAll(rankings);
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
    public RoundFinalizationDto calculateRoundQualification(Authentication authentication, Integer roundId) {
        UserEntity coordinator = currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);
        if (!Boolean.TRUE.equals(round.getScoreLocked())) {
            throw new ApiException(HttpStatus.CONFLICT, "Finalize this round before calculating qualification");
        }
        if (Boolean.TRUE.equals(round.getFinalRound())) {
            throw new ApiException(HttpStatus.CONFLICT, "Qualification does not apply to the final round");
        }

        RoundEntity nextRound = nextRoundFor(round)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "No next round is configured for qualification"));
        Integer topN = round.getPromotionRuleTopN();
        if (topN == null || topN < 1) {
            throw new ApiException(HttpStatus.CONFLICT, "Configure a valid Top N promotion rule before calculating qualification");
        }

        List<RankingEntity> rankings = rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(roundId);
        if (rankings.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "Finalize this round before calculating qualification");
        }
        if (isQualificationCalculated(rankings)) {
            throw new ApiException(HttpStatus.CONFLICT, "Qualification has already been calculated for this round");
        }

        List<Map<String, Object>> previousRankings = rankings.stream()
                .map(this::toRankingMap)
                .toList();
        Map<Integer, SubmissionEntity> submissionsByTeamId = findCompetitionSubmissions(roundId)
                .stream()
                .collect(Collectors.toMap(item -> item.getTeam().getTeamId(), Function.identity(), (left, right) -> left));
        LocalDateTime calculatedAt = LocalDateTime.now();

        for (RankingEntity ranking : rankings) {
            RankingQualificationStatus currentStatus = RankingQualificationStatus.from(ranking.getQualificationStatus());
            if (currentStatus == RankingQualificationStatus.DISQUALIFIED) {
                ranking.setQualifiedNextRound(false);
                ranking.setQualificationStatus(RankingQualificationStatus.DISQUALIFIED.getDbValue());
                ranking.setQualificationCalculatedAt(calculatedAt);
                continue;
            }
            boolean qualified = ranking.getRankPosition() != null && ranking.getRankPosition() <= topN;
            ranking.setQualifiedNextRound(false);
            ranking.setQualificationStatus((qualified
                    ? RankingQualificationStatus.QUALIFIED
                    : RankingQualificationStatus.ELIMINATED).getDbValue());
            ranking.setQualificationNote(buildQualificationDecisionNote(qualified, nextRound, topN));
            ranking.setQualificationCalculatedAt(calculatedAt);
        }

        rankingRepository.saveAll(rankings);

        auditLogService.record(
                coordinator,
                "ROUND_QUALIFICATION_CALCULATED",
                TARGET_ENTITY_ROUND,
                roundId,
                previousRankings,
                rankings.stream().map(this::toRankingMap).toList(),
                "Calculated qualification results for round " + round.getRoundName()
        );
        return buildRoundFinalization(round);
    }

    @Transactional
    public RoundFinalizationDto applyRoundAdvancement(Authentication authentication, Integer roundId) {
        UserEntity coordinator = currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);
        if (!Boolean.TRUE.equals(round.getScoreLocked())) {
            throw new ApiException(HttpStatus.CONFLICT, "Finalize and qualify this round before promoting teams");
        }
        if (Boolean.TRUE.equals(round.getFinalRound())) {
            throw new ApiException(HttpStatus.CONFLICT, "Promotion to the next round does not apply to the final round");
        }

        RoundEntity nextRound = nextRoundFor(round)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "No next round is configured for promotion"));
        List<RankingEntity> rankings = rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(roundId);
        if (rankings.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "Finalize and qualify this round before promoting teams");
        }
        if (!isQualificationCalculated(rankings)) {
            throw new ApiException(HttpStatus.CONFLICT, "Calculate qualification before promoting teams to the next round");
        }

        List<SubmissionEntity> submissions = findCompetitionSubmissions(roundId);
        if (isAdvancementApplied(round, rankings, submissions)) {
            throw new ApiException(HttpStatus.CONFLICT, "Promotion and elimination have already been applied for this round");
        }

        try {
            List<Map<String, Object>> previousRankings = rankings.stream()
                    .map(this::toRankingMap)
                    .toList();
            Map<Integer, SubmissionEntity> submissionsByTeamId = submissions.stream()
                    .collect(Collectors.toMap(item -> item.getTeam().getTeamId(), Function.identity(), (left, right) -> left));

            List<SubmissionEntity> validSubmissions = new ArrayList<>();

            for (RankingEntity ranking : rankings) {
                RankingQualificationStatus qualificationStatus = RankingQualificationStatus.from(ranking.getQualificationStatus());
                SubmissionEntity submission = submissionsByTeamId.get(ranking.getTeam().getTeamId());
                if (submission == null) {
                    continue;
                }
                
                if (qualificationStatus == RankingQualificationStatus.DISQUALIFIED) {
                    ranking.setQualifiedNextRound(false);
                    submission.setStatus(SubmissionStatus.DISQUALIFIED.getDbValue());
                } else if (qualificationStatus == RankingQualificationStatus.QUALIFIED) {
                    ranking.setQualifiedNextRound(true);
                    submission.setStatus(SubmissionStatus.QUALIFIED.getDbValue());
                } else if (qualificationStatus == RankingQualificationStatus.ELIMINATED) {
                    ranking.setQualifiedNextRound(false);
                    submission.setStatus(SubmissionStatus.ELIMINATED.getDbValue());
                }
                validSubmissions.add(submission);
            }

            rankingRepository.saveAll(rankings);
            
            // Try to save submissions, but skip any that fail validation
            for (SubmissionEntity submission : validSubmissions) {
                try {
                    submissionRepository.save(submission);
                } catch (Exception subEx) {
                    String msg = subEx.getMessage() != null ? subEx.getMessage() : subEx.toString();
                    if (msg.contains("team with")) {
                        System.err.println("[WARN-ADVANCE] Skipped submission for team " + submission.getTeam().getTeamName() + 
                                " - team validation failed: " + msg);
                    } else {
                        throw subEx;
                    }
                }
            }

            auditLogService.record(
                    coordinator,
                    "ROUND_ADVANCEMENT_APPLIED",
                    TARGET_ENTITY_ROUND,
                    roundId,
                    previousRankings,
                    rankings.stream().map(this::toRankingMap).toList(),
                    "Promoted qualified teams to " + nextRound.getRoundName() + " and eliminated the remaining teams for round " + round.getRoundName()
            );
            return buildRoundFinalization(round);
        } catch (Exception ex) {
            System.err.println("[ERROR-ADVANCE] Round advancement failed for round " + roundId + ": " + ex.getMessage());
            ex.printStackTrace();
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to apply round advancement: " + ex.getMessage());
        }
    }

    @Transactional
    public RoundFinalizationDto manuallyDisqualifySubmission(Authentication authentication,
                                                             Integer roundId,
                                                             Integer submissionId,
                                                             ManualEliminationRequest request) {
        UserEntity coordinator = currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);

        List<SubmissionEntity> submissions = findCompetitionSubmissions(roundId);
        List<RankingEntity> rankings = new ArrayList<>(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(roundId));
        if (isAdvancementApplied(round, rankings, submissions)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Manual disqualification is locked after promotion to the next round has been applied");
        }

        SubmissionEntity submission = submissions.stream()
                .filter(item -> item.getSubmissionId().equals(submissionId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Submission not found in this round"));
        RankingEntity targetRanking = rankings.stream()
                .filter(item -> item.getTeam().getTeamId().equals(submission.getTeam().getTeamId()))
                .findFirst()
                .orElseGet(() -> {
                    RankingEntity ranking = new RankingEntity();
                    ranking.setRound(round);
                    ranking.setTeam(submission.getTeam());
                    ranking.setRankPosition(DISQUALIFIED_RANK_BASE);
                    ranking.setTotalScore(resolveSubmissionScoreForManualDisqualification(round, submissionId));
                    rankings.add(ranking);
                    return ranking;
                });
        if (RankingQualificationStatus.from(targetRanking.getQualificationStatus()) == RankingQualificationStatus.DISQUALIFIED) {
            throw new ApiException(HttpStatus.CONFLICT, "This team has already been manually disqualified");
        }

        String reason = normalizeRequired(request.reason(), "Elimination reason");
        Integer affectedTrackId = submission.getTeam().getTrack().getTrackId();
        List<Map<String, Object>> previousRankings = rankings.stream()
                .map(this::toRankingMap)
                .toList();
        Map<Integer, SubmissionEntity> submissionsByTeamId = submissions.stream()
                .collect(Collectors.toMap(item -> item.getTeam().getTeamId(), Function.identity(), (left, right) -> left));

        targetRanking.setQualifiedNextRound(false);
        targetRanking.setQualificationStatus(RankingQualificationStatus.DISQUALIFIED.getDbValue());
        targetRanking.setQualificationNote("Disqualified: " + reason);
        targetRanking.setQualificationCalculatedAt(LocalDateTime.now());
        submission.setStatus(SubmissionStatus.DISQUALIFIED.getDbValue());

        if (Boolean.TRUE.equals(round.getScoreLocked())) {
            rebalanceTrackRankingsAfterDisqualification(round, rankings, submissionsByTeamId, affectedTrackId);
        }

        rankingRepository.saveAll(rankings);
        submissionRepository.saveAll(new ArrayList<>(submissionsByTeamId.values()));

        auditLogService.record(
                coordinator,
                "ROUND_TEAM_MANUALLY_DISQUALIFIED",
                TARGET_ENTITY_SUBMISSION,
                submissionId,
                previousRankings,
                rankings.stream().map(this::toRankingMap).toList(),
                "Manually disqualified " + submission.getTeam().getTeamName() + " from round " + round.getRoundName()
        );
        return buildRoundFinalization(round);
    }

    @Transactional
    public RoundFinalizationDto undoManualDisqualification(Authentication authentication,
                                                           Integer roundId,
                                                           Integer submissionId) {
        UserEntity coordinator = currentCoordinator(authentication);
        RoundEntity round = getRoundOrThrow(roundId);

        List<SubmissionEntity> submissions = findCompetitionSubmissions(roundId);
        List<RankingEntity> rankings = new ArrayList<>(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(roundId));
        if (isAdvancementApplied(round, rankings, submissions)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Undo disqualification is locked after promotion to the next round has been applied");
        }

        SubmissionEntity submission = submissions.stream()
                .filter(item -> item.getSubmissionId().equals(submissionId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Submission not found in this round"));
        RankingEntity targetRanking = rankings.stream()
                .filter(item -> item.getTeam().getTeamId().equals(submission.getTeam().getTeamId()))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "This team is not manually disqualified"));
        if (RankingQualificationStatus.from(targetRanking.getQualificationStatus()) != RankingQualificationStatus.DISQUALIFIED) {
            throw new ApiException(HttpStatus.CONFLICT, "This team is not manually disqualified");
        }

        Integer affectedTrackId = submission.getTeam().getTrack().getTrackId();
        List<Map<String, Object>> previousRankings = rankings.stream()
                .map(this::toRankingMap)
                .toList();
        Map<Integer, SubmissionEntity> submissionsByTeamId = submissions.stream()
                .collect(Collectors.toMap(item -> item.getTeam().getTeamId(), Function.identity(), (left, right) -> left));

        if (Boolean.TRUE.equals(round.getScoreLocked())) {
            targetRanking.setQualificationStatus(resolvePersistedQualificationStatus(round).getDbValue());
            targetRanking.setQualificationNote(buildPostDisqualificationNote(round));
            targetRanking.setQualificationCalculatedAt(null);
            targetRanking.setQualifiedNextRound(false);
            rebalanceTrackRankingsAfterDisqualification(round, rankings, submissionsByTeamId, affectedTrackId);
            rankingRepository.saveAll(rankings);
        } else {
            rankings.remove(targetRanking);
            rankingRepository.delete(targetRanking);
        }

        submission.setStatus(resolveSubmissionStatusAfterUndoDisqualification(submissionId).getDbValue());
        submissionRepository.saveAll(new ArrayList<>(submissionsByTeamId.values()));

        auditLogService.record(
                coordinator,
                "ROUND_TEAM_DISQUALIFICATION_UNDONE",
                TARGET_ENTITY_SUBMISSION,
                submissionId,
                previousRankings,
                rankings.stream().map(this::toRankingMap).toList(),
                "Undid manual disqualification for " + submission.getTeam().getTeamName() + " in round " + round.getRoundName()
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
        List<SubmissionEntity> submissions = findCompetitionSubmissions(roundId);
        if (isAdvancementApplied(round, previousRankings, submissions)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Cannot reopen this round after promotion to the next round has already been applied");
        }
        Set<Integer> promotedTeamIds = previousRankings.stream()
                .filter(item -> Boolean.TRUE.equals(item.getQualifiedNextRound()))
                .map(item -> item.getTeam().getTeamId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Optional<RoundEntity> nextRound = nextRoundFor(round);
        if (nextRound.isPresent()
                && !promotedTeamIds.isEmpty()
                && submissionRepository.existsByRoundRoundIdAndTeamTeamIdIn(nextRound.get().getRoundId(), promotedTeamIds)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Cannot reopen this round after promoted teams have already submitted to " + nextRound.get().getRoundName());
        }
        Set<Integer> disqualifiedTeamIds = previousRankings.stream()
                .filter(item -> RankingQualificationStatus.from(item.getQualificationStatus()) == RankingQualificationStatus.DISQUALIFIED)
                .map(item -> item.getTeam().getTeamId())
                .collect(Collectors.toSet());
        for (SubmissionEntity submission : submissions) {
            submission.setStatus(disqualifiedTeamIds.contains(submission.getTeam().getTeamId())
                    ? SubmissionStatus.DISQUALIFIED.getDbValue()
                    : SubmissionStatus.EVALUATING.getDbValue());
        }
        submissionRepository.saveAll(submissions);
        rankingRepository.deleteAll(previousRankings.stream()
                .filter(item -> RankingQualificationStatus.from(item.getQualificationStatus()) != RankingQualificationStatus.DISQUALIFIED)
                .toList());
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
        Optional<RoundEntity> nextRound = nextRoundFor(round);
        List<ScoringCriteriaEntity> criteria = criteriaRepository.findByRoundRoundIdOrderByCriteriaIdAsc(round.getRoundId());
        List<SubmissionEntity> submissions = findCompetitionSubmissions(round.getRoundId());
        List<JudgeAssignmentEntity> assignments = judgeAssignmentRepository.findByRoundRoundIdOrderByTrackAndJudge(round.getRoundId());
        List<JudgeEvaluationEntity> evaluations = judgeEvaluationRepository.findBySubmissionRoundRoundId(round.getRoundId());
        List<ScoreEntity> scores = scoreRepository.findBySubmissionRoundRoundId(round.getRoundId());
        List<RankingEntity> existingRankings = rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(round.getRoundId());
        Set<Integer> disqualifiedTeamIds = existingRankings.stream()
                .filter(item -> RankingQualificationStatus.from(item.getQualificationStatus()) == RankingQualificationStatus.DISQUALIFIED)
                .map(item -> item.getTeam().getTeamId())
                .collect(Collectors.toSet());

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
            RankingEntity existingRanking = rankingByTeamId.get(submission.getTeam().getTeamId());
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
            if (disqualifiedTeamIds.contains(submission.getTeam().getTeamId())) {
                readinessNote = "Manually disqualified from this round";
                ready = true;
            } else if (criteria.isEmpty()) {
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

            BigDecimal totalScore = ready && !judgeTotals.isEmpty()
                    ? judgeTotals.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(judgeTotals.size()), 2, RoundingMode.HALF_UP)
                    : existingRanking == null ? null : existingRanking.getTotalScore();

            snapshots.add(new RoundSubmissionSnapshot(
                    submission,
                    assignedJudgeCount,
                    finalizedJudgeCount,
                    totalScore,
                    ready,
                    readinessNote
            ));
        }

        rankSnapshots(snapshots, disqualifiedTeamIds);
        applyQualificationProjection(snapshots, round, nextRound.orElse(null));
        List<FinalizationSubmissionDto> submissionDtos = snapshots.stream()
                .map(item -> toFinalizationSubmissionDto(item, rankingByTeamId.get(item.submission.getTeam().getTeamId())))
                .sorted(Comparator
                        .comparing(FinalizationSubmissionDto::trackName)
                        .thenComparing(item -> RankingQualificationStatus.from(item.qualificationStatus()) == RankingQualificationStatus.DISQUALIFIED ? 1 : 0)
                        .thenComparing(item -> item.rankPosition() == null ? Integer.MAX_VALUE : item.rankPosition())
                        .thenComparing(FinalizationSubmissionDto::teamName, String.CASE_INSENSITIVE_ORDER))
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
            finalizationNote = "All submissions are ready. Finalization will lock scoring and write ranking results for this round.";
        }

        LocalDateTime finalizedAt = existingRankings.stream()
                .map(RankingEntity::getCalculatedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);
        boolean qualificationCalculated = hasCompleteRankingSnapshot(existingRankings, submissions)
                && isQualificationCalculated(existingRankings);
        String qualificationNote = buildRoundQualificationNote(round, nextRound.orElse(null), qualificationCalculated);
        boolean advancementApplied = hasCompleteRankingSnapshot(existingRankings, submissions)
                && isAdvancementApplied(round, existingRankings, submissions);
        String advancementNote = buildRoundAdvancementNote(
                round,
                nextRound.orElse(null),
                qualificationCalculated,
                advancementApplied
        );

        return new RoundFinalizationDto(
                event.getEventId(),
                event.getName(),
                round.getRoundId(),
                round.getRoundName(),
                round.getRoundOrder(),
                round.getPromotionRuleTopN(),
                nextRound.map(RoundEntity::getRoundId).orElse(null),
                nextRound.map(RoundEntity::getRoundName).orElse(null),
                Boolean.TRUE.equals(round.getScoreLocked()),
                criteria.size(),
                submissions.size(),
                readyCount,
                canFinalize,
                finalizationNote,
                qualificationCalculated,
                qualificationNote,
                advancementApplied,
                advancementNote,
                finalizedAt,
                submissionDtos
        );
    }

    private void rankSnapshots(List<RoundSubmissionSnapshot> snapshots,
                               Set<Integer> disqualifiedTeamIds) {
        Map<Integer, List<RoundSubmissionSnapshot>> byTrack = snapshots.stream()
                .filter(item -> item.ready
                        && item.totalScore != null
                        && !disqualifiedTeamIds.contains(item.submission.getTeam().getTeamId()))
                .collect(Collectors.groupingBy(item -> item.submission.getTeam().getTrack().getTrackId()));
        byTrack.values().forEach(items -> {
            // Keep tie-break ordering centralized so future qualification rules can swap strategies safely.
            items.sort(Comparator
                    .comparing((RoundSubmissionSnapshot item) -> item.totalScore, Comparator.reverseOrder())
                    .thenComparing(item -> item.submission.getSubmittedAt())
                    .thenComparing(item -> item.submission.getTeam().getTeamName(), String.CASE_INSENSITIVE_ORDER));
            for (int index = 0; index < items.size(); index += 1) {
                RoundSubmissionSnapshot item = items.get(index);
                item.rankPosition = index + 1;
            }
        });
    }

    private void applyQualificationProjection(List<RoundSubmissionSnapshot> snapshots,
                                              RoundEntity round,
                                              RoundEntity nextRound) {
        Integer topN = round.getPromotionRuleTopN();
        boolean finalRound = Boolean.TRUE.equals(round.getFinalRound());
        boolean hasNextRound = nextRound != null;

        for (RoundSubmissionSnapshot item : snapshots) {
            item.projectedQualifiedNextRound = null;
            if (!item.ready || item.rankPosition == null) {
                item.qualificationNote = "Qualification preview is unavailable until ranking is complete for this submission.";
                continue;
            }
            if (finalRound) {
                item.qualificationNote = "This is the final round, so next-round qualification does not apply.";
                continue;
            }
            if (!hasNextRound) {
                item.qualificationNote = "No next round is configured yet, so qualification remains pending.";
                continue;
            }
            if (topN == null || topN < 1) {
                item.qualificationNote = "Top N promotion is not configured yet for this round.";
                continue;
            }
            item.projectedQualifiedNextRound = item.rankPosition <= topN;
            item.qualificationNote = Boolean.TRUE.equals(item.projectedQualifiedNextRound)
                    ? "Projected to advance by the configured Top " + topN + " rule. Run qualification calculation to confirm this result."
                    : "Currently below the projected Top " + topN + " cutoff. Run qualification calculation to confirm elimination.";
        }
    }

    private List<EventWizardAwardRequest> readAwards(String rawAwards) {
        if (rawAwards == null || rawAwards.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(rawAwards, new TypeReference<List<EventWizardAwardRequest>>() {
            });
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String writeAwardSelectionSummary(String existingAwards, List<AwardRecommendationSummaryDto.AwardRecommendationDto> awards) {
        try {
            List<Map<String, Object>> payload = awards.stream().map(award -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("awardName", award.awardName());
                item.put("quantity", award.quantity());
                item.put("winnerTeamIds", award.selectedWinnerTeamIds());
                return item;
            }).toList();
            return objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            return existingAwards == null ? "[]" : existingAwards;
        }
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
        boolean qualifiedNextRound = existingRanking != null && Boolean.TRUE.equals(existingRanking.getQualifiedNextRound());
        BigDecimal totalScore = item.totalScore != null
                ? item.totalScore
                : existingRanking == null ? null : existingRanking.getTotalScore();
        String qualificationStatus = existingRanking == null || existingRanking.getQualificationStatus() == null
                ? resolveDraftQualificationStatus(item)
                : existingRanking.getQualificationStatus();
        String qualificationNote = existingRanking == null || existingRanking.getQualificationNote() == null
                ? item.qualificationNote
                : existingRanking.getQualificationNote();
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
                effectiveRankPosition(existingRanking, rankPosition),
                qualifiedNextRound,
                item.projectedQualifiedNextRound,
                qualificationStatus,
                qualificationNote,
                item.ready,
                item.readinessNote
        );
    }

    private RoundEntity resolveFinalRound(Integer eventId) {
        List<RoundEntity> rounds = roundRepository.findByEventIdOrderByRoundOrderAsc(eventId);
        return rounds.stream()
                .filter(round -> Boolean.TRUE.equals(round.getFinalRound()))
                .findFirst()
                .orElse(rounds.isEmpty() ? null : rounds.get(rounds.size() - 1));
    }

    private boolean isResultPublished(HackathonEventEntity event) {
        return event != null && "Ended".equalsIgnoreCase(event.getStatus());
    }

    private List<SubmissionEntity> findCompetitionSubmissions(Integer roundId) {
        return submissionRepository.findByRoundRoundIdOrderByTeamTeamNameAsc(roundId).stream()
                .filter(submission -> !Boolean.TRUE.equals(submission.getCalibration()))
                .toList();
    }

    private ResultPublicationDto toResultPublicationDto(HackathonEventEntity event,
                                                        RoundEntity finalRound,
                                                        Integer publishedRankingCount,
                                                        Integer notificationCount,
                                                        String message) {
        RoundFinalizationDto finalization = finalRound == null ? null : buildRoundFinalization(finalRound);
        boolean finalRoundScoreLocked = finalization != null && finalization.scoreLocked();
        int finalRoundSubmissionCount = finalization == null || finalization.totalSubmissions() == null
                ? 0
                : finalization.totalSubmissions();
        int rankingCount = publishedRankingCount == null ? 0 : publishedRankingCount;
        boolean rankingSnapshotComplete = finalRound != null
                && finalRoundSubmissionCount > 0
                && rankingCount >= finalRoundSubmissionCount;
        boolean published = isResultPublished(event);
        boolean canPublish = published
                || (finalRound != null
                && finalRoundScoreLocked
                && finalRoundSubmissionCount > 0
                && rankingSnapshotComplete);
        String readinessNote = buildResultPublicationReadinessNote(
                published,
                finalRound,
                finalRoundScoreLocked,
                finalRoundSubmissionCount,
                rankingSnapshotComplete
        );

        return new ResultPublicationDto(
                event.getEventId(),
                event.getName(),
                event.getStatus(),
                published,
                event.getPublishedAt(),
                finalRound == null ? null : finalRound.getRoundId(),
                finalRound == null ? null : finalRound.getRoundName(),
                publishedRankingCount,
                notificationCount,
                message,
                finalRoundScoreLocked,
                finalRoundSubmissionCount,
                rankingSnapshotComplete,
                canPublish,
                readinessNote
        );
    }

    private String buildResultPublicationReadinessNote(boolean published,
                                                       RoundEntity finalRound,
                                                       boolean finalRoundScoreLocked,
                                                       int finalRoundSubmissionCount,
                                                       boolean rankingSnapshotComplete) {
        if (published) {
            return "Final results have already been published.";
        }
        if (finalRound == null) {
            return "Configure at least one round before publishing results.";
        }
        if (!finalRoundScoreLocked) {
            return "Finalize the final round (" + finalRound.getRoundName() + ") before publishing event results.";
        }
        if (finalRoundSubmissionCount == 0) {
            return "No final-round submissions are available to publish.";
        }
        if (!rankingSnapshotComplete) {
            return "Final-round ranking snapshot is incomplete. Re-finalize the final round before publishing.";
        }
        return "Final results are ready to publish.";
    }

    private RoundFinalizationDto buildReportableRoundFinalization(Integer roundId, Integer trackId) {
        RoundEntity round = getRoundOrThrow(roundId);
        if (trackId != null) {
            TrackEntity track = trackRepository.findById(trackId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Track not found"));
            if (!Objects.equals(track.getEventId(), round.getEventId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Track does not belong to the selected round event");
            }
        }
        RoundFinalizationDto finalization = buildRoundFinalization(round);
        if (!finalization.scoreLocked()) {
            throw new ApiException(HttpStatus.CONFLICT, "Finalize this round before exporting ranking reports");
        }
        if (filterReportRows(finalization, trackId).isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "No finalized ranking rows are available for this report");
        }
        return finalization;
    }

    private List<FinalizationSubmissionDto> filterReportRows(RoundFinalizationDto finalization, Integer trackId) {
        return finalization.submissions().stream()
                .filter(item -> trackId == null || Objects.equals(item.trackId(), trackId))
                .toList();
    }

    private List<String> rankingReportHeaders() {
        return List.of(
                "event_name",
                "round_name",
                "round_order",
                "track_name",
                "rank_position",
                "team_name",
                "total_score",
                "qualification_status",
                "qualified_next_round",
                "submission_status",
                "assigned_judge_count",
                "finalized_judge_count",
                "readiness_note",
                "repository_url"
        );
    }

    private List<String> rankingReportValues(RoundFinalizationDto finalization, FinalizationSubmissionDto item) {
        return List.of(
                stringValue(finalization.eventName()),
                stringValue(finalization.roundName()),
                stringValue(finalization.roundOrder()),
                stringValue(item.trackName()),
                stringValue(item.rankPosition()),
                stringValue(item.teamName()),
                stringValue(item.totalScore()),
                stringValue(item.qualificationStatus()),
                stringValue(item.qualifiedNextRound()),
                stringValue(item.submissionStatus()),
                stringValue(item.assignedJudgeCount()),
                stringValue(item.finalizedJudgeCount()),
                stringValue(item.readinessNote()),
                stringValue(item.repositoryUrl())
        );
    }

    private String escapeHtml(String value) {
        return stringValue(value)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private Double average(List<Double> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.stream().mapToDouble(Double::doubleValue).average().orElse(0);
    }

    private Double variance(List<Double> values) {
        if (values == null || values.size() < 2) {
            return null;
        }
        double mean = values.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        return values.stream()
                .mapToDouble(value -> Math.pow(value - mean, 2))
                .average()
                .orElse(0);
    }

    private Double standardDeviation(Double variance) {
        return variance == null ? null : Math.sqrt(variance);
    }

    private Double min(List<Double> values) {
        return values == null || values.isEmpty()
                ? null
                : values.stream().mapToDouble(Double::doubleValue).min().orElse(0);
    }

    private Double max(List<Double> values) {
        return values == null || values.isEmpty()
                ? null
                : values.stream().mapToDouble(Double::doubleValue).max().orElse(0);
    }

    private Double range(List<Double> values) {
        Double min = min(values);
        Double max = max(values);
        return min == null || max == null ? null : max - min;
    }

    private Double roundDouble(Double value) {
        if (value == null || value.isNaN() || value.isInfinite()) {
            return null;
        }
        return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP).doubleValue();
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
        payload.put("qualificationStatus", entity.getQualificationStatus());
        payload.put("qualificationNote", entity.getQualificationNote());
        return payload;
    }

    private Optional<RoundEntity> nextRoundFor(RoundEntity round) {
        if (round.getRoundOrder() == null) {
            return Optional.empty();
        }
        return roundRepository.findByEventIdAndRoundOrder(round.getEventId(), round.getRoundOrder() + 1);
    }

    private boolean isQualificationCalculated(List<RankingEntity> rankings) {
        if (rankings.isEmpty()) {
            return false;
        }
        return rankings.stream()
                .allMatch(ranking -> {
                    try {
                        RankingQualificationStatus status = RankingQualificationStatus.from(ranking.getQualificationStatus());
                        return status != RankingQualificationStatus.PENDING;
                    } catch (IllegalArgumentException ex) {
                        // Invalid status - treat as not calculated
                        return false;
                    }
                });
    }

    private boolean hasCompleteRankingSnapshot(List<RankingEntity> rankings,
                                               List<SubmissionEntity> submissions) {
        return rankings.size() >= submissions.size();
    }

    private boolean isAdvancementApplied(RoundEntity round,
                                         List<RankingEntity> rankings,
                                         List<SubmissionEntity> submissions) {
        if (Boolean.TRUE.equals(round.getFinalRound())
                || rankings.isEmpty()
                || rankings.size() < submissions.size()
                || !isQualificationCalculated(rankings)) {
            return false;
        }
        Map<Integer, SubmissionEntity> submissionsByTeamId = submissions.stream()
                .collect(Collectors.toMap(item -> item.getTeam().getTeamId(), Function.identity(), (left, right) -> left));
        boolean hasDecision = false;
        for (RankingEntity ranking : rankings) {
            RankingQualificationStatus status = RankingQualificationStatus.from(ranking.getQualificationStatus());
            SubmissionEntity submission = submissionsByTeamId.get(ranking.getTeam().getTeamId());
            if (submission == null) {
                return false;
            }
            if (status == RankingQualificationStatus.DISQUALIFIED) {
                hasDecision = true;
                if (Boolean.TRUE.equals(ranking.getQualifiedNextRound())
                        || SubmissionStatus.from(submission.getStatus()) != SubmissionStatus.DISQUALIFIED) {
                    return false;
                }
            } else if (status == RankingQualificationStatus.QUALIFIED) {
                hasDecision = true;
                if (!Boolean.TRUE.equals(ranking.getQualifiedNextRound())
                        || SubmissionStatus.from(submission.getStatus()) != SubmissionStatus.QUALIFIED) {
                    return false;
                }
            } else if (status == RankingQualificationStatus.ELIMINATED) {
                hasDecision = true;
                if (Boolean.TRUE.equals(ranking.getQualifiedNextRound())
                        || SubmissionStatus.from(submission.getStatus()) != SubmissionStatus.ELIMINATED) {
                    return false;
                }
            }
        }
        return hasDecision;
    }

    private RankingQualificationStatus resolvePersistedQualificationStatus(RoundEntity round) {
        return Boolean.TRUE.equals(round.getFinalRound())
                ? RankingQualificationStatus.NOT_APPLICABLE
                : RankingQualificationStatus.PENDING;
    }

    private String resolveDraftQualificationStatus(RoundSubmissionSnapshot item) {
        if (item.rankPosition == null || !item.ready) {
            return RankingQualificationStatus.PENDING.getDbValue();
        }
        return RankingQualificationStatus.PENDING.getDbValue();
    }

    private String buildRoundQualificationNote(RoundEntity round,
                                               RoundEntity nextRound,
                                               boolean qualificationCalculated) {
        if (Boolean.TRUE.equals(round.getFinalRound())) {
            return "This is the final round, so next-round qualification is not applicable.";
        }
        if (qualificationCalculated) {
            return nextRound == null
                    ? "Qualification decisions have been recorded for this ranking set."
                    : "Qualification decisions have been recorded. Apply promotion to unlock "
                    + nextRound.getRoundName() + " for the qualified teams.";
        }
        if (nextRound == null) {
            return "Ranking is available, but no next round is configured yet for qualification.";
        }
        if (round.getPromotionRuleTopN() == null || round.getPromotionRuleTopN() < 1) {
            return "Ranking is available. Configure a Top N promotion rule before calculating qualification.";
        }
        if (!Boolean.TRUE.equals(round.getScoreLocked())) {
            return "Finalize this round first, then calculate qualification for " + nextRound.getRoundName() + ".";
        }
        return "Round is finalized. Run qualification calculation to confirm which teams advance to "
                + nextRound.getRoundName() + ".";
    }

    private String buildRoundAdvancementNote(RoundEntity round,
                                             RoundEntity nextRound,
                                             boolean qualificationCalculated,
                                             boolean advancementApplied) {
        if (Boolean.TRUE.equals(round.getFinalRound())) {
            return "This is the final round, so promotion and elimination are not applicable.";
        }
        if (nextRound == null) {
            return "No next round is configured, so promotion cannot be applied.";
        }
        if (!qualificationCalculated) {
            return "Calculate qualification before promoting teams to " + nextRound.getRoundName() + ".";
        }
        if (advancementApplied) {
            return "Qualified teams can now submit to " + nextRound.getRoundName() + ". Eliminated teams have been locked out.";
        }
        return "Qualification is ready. Promote the qualified teams to " + nextRound.getRoundName()
                + " and eliminate the remaining teams.";
    }

    private String buildQualificationDecisionNote(boolean qualified,
                                                  RoundEntity nextRound,
                                                  Integer topN) {
        return qualified
                ? "Qualified by the Top " + topN + " rule for " + nextRound.getRoundName() + "."
                : "Marked for elimination after finishing below the Top " + topN + " cutoff for " + nextRound.getRoundName() + ".";
    }

    private Integer effectiveRankPosition(RankingEntity existingRanking,
                                          Integer computedRankPosition) {
        if (existingRanking != null
                && RankingQualificationStatus.from(existingRanking.getQualificationStatus()) == RankingQualificationStatus.DISQUALIFIED) {
            return null;
        }
        return computedRankPosition;
    }

    private void rebalanceTrackRankingsAfterDisqualification(RoundEntity round,
                                                             List<RankingEntity> rankings,
                                                             Map<Integer, SubmissionEntity> submissionsByTeamId,
                                                             Integer affectedTrackId) {
        List<RankingEntity> affectedTrackRankings = rankings.stream()
                .filter(item -> item.getTeam().getTrack().getTrackId().equals(affectedTrackId))
                .toList();

        List<RankingEntity> activeRankings = affectedTrackRankings.stream()
                .filter(item -> RankingQualificationStatus.from(item.getQualificationStatus()) != RankingQualificationStatus.DISQUALIFIED)
                .sorted(rankingComparator(submissionsByTeamId))
                .toList();
        for (int index = 0; index < activeRankings.size(); index += 1) {
            RankingEntity ranking = activeRankings.get(index);
            ranking.setRankPosition(index + 1);
            ranking.setQualifiedNextRound(false);
            ranking.setQualificationStatus(resolvePersistedQualificationStatus(round).getDbValue());
            ranking.setQualificationCalculatedAt(null);
            ranking.setQualificationNote(buildPostDisqualificationNote(round));
        }

        List<RankingEntity> disqualifiedRankings = affectedTrackRankings.stream()
                .filter(item -> RankingQualificationStatus.from(item.getQualificationStatus()) == RankingQualificationStatus.DISQUALIFIED)
                .sorted(Comparator.comparing(item -> item.getTeam().getTeamName(), String.CASE_INSENSITIVE_ORDER))
                .toList();
        for (int index = 0; index < disqualifiedRankings.size(); index += 1) {
            RankingEntity ranking = disqualifiedRankings.get(index);
            ranking.setRankPosition(DISQUALIFIED_RANK_BASE + index);
            ranking.setQualifiedNextRound(false);
        }
    }

    private Comparator<RankingEntity> rankingComparator(Map<Integer, SubmissionEntity> submissionsByTeamId) {
        return Comparator
                .comparing(RankingEntity::getTotalScore, Comparator.reverseOrder())
                .thenComparing(item -> {
                    SubmissionEntity submission = submissionsByTeamId.get(item.getTeam().getTeamId());
                    return submission == null ? null : submission.getSubmittedAt();
                }, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(item -> item.getTeam().getTeamName(), String.CASE_INSENSITIVE_ORDER);
    }

    private String buildPostDisqualificationNote(RoundEntity round) {
        if (Boolean.TRUE.equals(round.getFinalRound())) {
            return "This is the final round, so next-round qualification does not apply.";
        }
        return "Manual disqualification changed the ranking. Run qualification calculation again for this track.";
    }

    private SubmissionStatus resolveSubmissionStatusAfterUndoDisqualification(Integer submissionId) {
        if (scoreRepository.existsBySubmissionSubmissionId(submissionId)
                || judgeEvaluationRepository.existsBySubmissionSubmissionId(submissionId)) {
            return SubmissionStatus.EVALUATING;
        }
        return SubmissionStatus.SUBMITTED;
    }

    private BigDecimal resolveSubmissionScoreForManualDisqualification(RoundEntity round,
                                                                       Integer submissionId) {
        return buildRoundFinalization(round).submissions().stream()
                .filter(item -> item.submissionId().equals(submissionId))
                .findFirst()
                .map(item -> item.totalScore() == null ? BigDecimal.ZERO : item.totalScore())
                .orElse(BigDecimal.ZERO);
    }

    private void appendCsvRow(StringBuilder csv, List<String> values) {
        for (int index = 0; index < values.size(); index += 1) {
            if (index > 0) {
                csv.append(',');
            }
            csv.append(escapeCsv(values.get(index)));
        }
        csv.append(System.lineSeparator());
    }

    private String escapeCsv(String value) {
        String normalized = value == null ? "" : value;
        boolean needsQuoting = normalized.contains(",")
                || normalized.contains("\"")
                || normalized.contains("\n")
                || normalized.contains("\r");
        if (!needsQuoting) {
            return normalized;
        }
        return "\"" + normalized.replace("\"", "\"\"") + "\"";
    }

    private String anonymizedCode(String prefix, Integer id) {
        return prefix + "_" + (id == null ? "UNKNOWN" : id);
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private <T> Integer nullableInt(T value, Function<T, Integer> mapper) {
        return value == null ? 0 : mapper.apply(value);
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

    private UserEntity currentUserWithAnyScoringRole(Authentication authentication) {
        if (authentication == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        UserEntity user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        boolean hasCoordinator = userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(
                user.getUserId(),
                RoleType.COORDINATOR.getDbValue()
        ).isPresent();
        boolean hasJudge = userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(
                user.getUserId(),
                RoleType.JUDGE.getDbValue()
        ).isPresent();
        if (!hasCoordinator && !hasJudge) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Scoring role is required");
        }
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

    private CalibrationSessionDto toCalibrationSessionDto(CalibrationSessionEntity session) {
        Integer roundId = session.getRound() == null ? null : session.getRound().getRoundId();
        return new CalibrationSessionDto(
                session.getSessionId(),
                roundId,
                session.getTitle(),
                session.getStatus(),
                session.getCreatedAt()
        );
    }

    private CalibrationScoreDto toCalibrationScoreDto(CalibrationScoreEntity score) {
        return new CalibrationScoreDto(
                score.getCalibrationScoreId(),
                score.getSubmission().getSubmissionId(),
                score.getSubmission().getTeam().getTeamName(),
                score.getCriteria().getCriteriaId(),
                score.getCriteria().getCriteriaName(),
                score.getJudgeAssignment().getJudgeAssignmentId(),
                score.getScoreValue(),
                score.getComment(),
                score.getScoredAt()
        );
    }

    private static final class RoundSubmissionSnapshot {
        private final SubmissionEntity submission;
        private final int assignedJudgeCount;
        private final int finalizedJudgeCount;
        private final BigDecimal totalScore;
        private final boolean ready;
        private final String readinessNote;
        private Integer rankPosition;
        private Boolean projectedQualifiedNextRound;
        private String qualificationNote;

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

    private final class VarianceBucket {
        private final Integer trackId;
        private final String trackName;
        private final Integer teamId;
        private final String teamName;
        private final Integer submissionId;
        private final Integer criteriaId;
        private final String criteriaName;
        private final List<Double> scores = new ArrayList<>();

        private VarianceBucket(ResearchDatasetRowProjection row, FinalizationSubmissionDto submission) {
            this.trackId = row.getTrackId();
            this.trackName = row.getTrackName();
            this.teamId = row.getTeamId();
            this.teamName = submission == null ? anonymizedCode("TEAM", row.getTeamId()) : submission.teamName();
            this.submissionId = row.getSubmissionId();
            this.criteriaId = row.getCriteriaId();
            this.criteriaName = row.getCriteriaName();
        }

        private void add(double score) {
            scores.add(score);
        }

        private boolean hasComparableScores() {
            return scores.size() >= 2;
        }

        private TeamCriterionVarianceDto toDto() {
            Double variance = variance(scores);
            return new TeamCriterionVarianceDto(
                    trackId,
                    trackName,
                    teamId,
                    teamName,
                    submissionId,
                    criteriaId,
                    criteriaName,
                    scores.size(),
                    roundDouble(average(scores)),
                    roundDouble(min(scores)),
                    roundDouble(max(scores)),
                    roundDouble(range(scores)),
                    roundDouble(variance),
                    roundDouble(standardDeviation(variance))
            );
        }
    }

    private final class CriterionVarianceAccumulator {
        private final Integer criteriaId;
        private final String criteriaName;
        private final String criteriaType;
        private final BigDecimal criteriaWeight;
        private final List<Double> scores = new ArrayList<>();
        private final List<Double> bucketVariances = new ArrayList<>();
        private final List<Double> bucketRanges = new ArrayList<>();
        private final Set<Integer> judgeAssignmentIds = new HashSet<>();

        private CriterionVarianceAccumulator(ResearchDatasetRowProjection row) {
            this.criteriaId = row.getCriteriaId();
            this.criteriaName = row.getCriteriaName();
            this.criteriaType = row.getCriteriaType();
            this.criteriaWeight = row.getCriteriaWeight();
        }

        private void addScore(double score, Integer judgeAssignmentId) {
            scores.add(score);
            if (judgeAssignmentId != null) {
                judgeAssignmentIds.add(judgeAssignmentId);
            }
        }

        private void addBucket(VarianceBucket bucket) {
            Double variance = variance(bucket.scores);
            Double range = range(bucket.scores);
            if (variance != null) {
                bucketVariances.add(variance);
            }
            if (range != null) {
                bucketRanges.add(range);
            }
        }

        private CriterionVarianceDto toDto() {
            Double averageVariance = average(bucketVariances);
            return new CriterionVarianceDto(
                    criteriaId,
                    criteriaName,
                    criteriaType,
                    criteriaWeight,
                    bucketVariances.size(),
                    scores.size(),
                    judgeAssignmentIds.size(),
                    roundDouble(average(scores)),
                    roundDouble(min(scores)),
                    roundDouble(max(scores)),
                    roundDouble(average(bucketRanges)),
                    roundDouble(averageVariance),
                    roundDouble(standardDeviation(averageVariance))
            );
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
