package com.seal.hackathon.evaluation.service;

import com.seal.hackathon.evaluation.dto.FeedbackDto;
import com.seal.hackathon.evaluation.dto.LeaderboardRowDto;
import com.seal.hackathon.evaluation.dto.RoundTrackLeaderboardDto;
import com.seal.hackathon.evaluation.dto.SubmissionCriterionBreakdownDto;
import com.seal.hackathon.evaluation.dto.SubmissionJudgeCriterionScoreDto;
import com.seal.hackathon.evaluation.dto.SubmissionJudgeScoreDto;
import com.seal.hackathon.evaluation.dto.SubmissionScoreBreakdownDto;
import com.seal.hackathon.evaluation.dto.TeamLeaderboardDto;
import com.seal.hackathon.evaluation.entity.AuditLogEntity;
import com.seal.hackathon.evaluation.entity.FeedbackEntity;
import com.seal.hackathon.evaluation.entity.JudgeEvaluationEntity;
import com.seal.hackathon.evaluation.entity.RankingEntity;
import com.seal.hackathon.evaluation.entity.ScoreEntity;
import com.seal.hackathon.evaluation.entity.ScoringCriteriaEntity;
import com.seal.hackathon.evaluation.entity.TeamPrizeEntity;
import com.seal.hackathon.evaluation.repository.AuditLogRepository;
import com.seal.hackathon.evaluation.repository.FeedbackRepository;
import com.seal.hackathon.evaluation.repository.JudgeEvaluationRepository;
import com.seal.hackathon.evaluation.repository.RankingRepository;
import com.seal.hackathon.evaluation.repository.ScoreRepository;
import com.seal.hackathon.evaluation.repository.ScoringCriteriaRepository;
import com.seal.hackathon.evaluation.repository.TeamPrizeRepository;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.submission.entity.SubmissionEntity;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import com.seal.hackathon.team.entity.TeamEntity;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LeaderboardService {

    private static final String ACTION_ROUND_RESULTS_PUBLISHED = "ROUND_RESULTS_PUBLISHED";
    private static final String TARGET_ENTITY_ROUND = "ROUND";

    private final RankingRepository rankingRepository;
    private final RoundRepository roundRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoreRepository scoreRepository;
    private final JudgeEvaluationRepository judgeEvaluationRepository;
    private final ScoringCriteriaRepository criteriaRepository;
    private final FeedbackRepository feedbackRepository;
    private final AuditLogRepository auditLogRepository;
    private final TeamPrizeRepository teamPrizeRepository;

    public LeaderboardService(RankingRepository rankingRepository,
                              RoundRepository roundRepository,
                              SubmissionRepository submissionRepository,
                              ScoreRepository scoreRepository,
                              JudgeEvaluationRepository judgeEvaluationRepository,
                              ScoringCriteriaRepository criteriaRepository,
                              FeedbackRepository feedbackRepository,
                              AuditLogRepository auditLogRepository,
                              TeamPrizeRepository teamPrizeRepository) {
        this.rankingRepository = rankingRepository;
        this.roundRepository = roundRepository;
        this.submissionRepository = submissionRepository;
        this.scoreRepository = scoreRepository;
        this.judgeEvaluationRepository = judgeEvaluationRepository;
        this.criteriaRepository = criteriaRepository;
        this.feedbackRepository = feedbackRepository;
        this.auditLogRepository = auditLogRepository;
        this.teamPrizeRepository = teamPrizeRepository;
    }

    public TeamLeaderboardDto buildTeamLeaderboard(HackathonEventEntity event, TeamEntity viewerTeam) {
        List<RoundEntity> rounds = roundRepository.findByEventIdOrderByRoundOrderAsc(event.getEventId());
        Set<Integer> publishedRoundIds = resolvePublishedRoundIds(event, rounds);
        Map<Integer, TeamPrizeEntity> finalAwardsByTeamId = teamPrizeRepository.findDetailedByEventId(event.getEventId())
                .stream()
                .collect(Collectors.toMap(
                        item -> item.getTeam().getTeamId(),
                        item -> item,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
        Integer viewerTrackId = viewerTeam.getTrack() == null ? null : viewerTeam.getTrack().getTrackId();
        List<RoundTrackLeaderboardDto> groups = buildRoundTrackLeaderboards(
                event,
                rounds,
                publishedRoundIds,
                viewerTeam.getTeamId(),
                viewerTrackId,
                finalAwardsByTeamId,
                false
        );
        boolean resultPublished = !groups.isEmpty();
        return new TeamLeaderboardDto(
                viewerTeam.getTeamId(),
                event.getEventId(),
                event.getName(),
                event.getStatus(),
                resultPublished,
                resolveLatestPublishedAt(event, rounds, publishedRoundIds),
                groups
        );
    }

    public SubmissionScoreBreakdownDto buildCoordinatorBreakdown(Integer submissionId) {
        SubmissionEntity submission = submissionRepository.findDetailedById(submissionId).orElse(null);
        if (submission == null) {
            return null;
        }
        return buildSubmissionScoreBreakdown(submission, true);
    }

    private List<RoundTrackLeaderboardDto> buildRoundTrackLeaderboards(HackathonEventEntity event,
                                                                       List<RoundEntity> rounds,
                                                                       Set<Integer> publishedRoundIds,
                                                                       Integer viewerTeamId,
                                                                       Integer viewerTrackId,
                                                                       Map<Integer, TeamPrizeEntity> finalAwardsByTeamId,
                                                                       boolean includeJudgeScores) {
        List<RoundTrackLeaderboardDto> groups = new ArrayList<>();

        for (RoundEntity round : rounds) {
            if (!publishedRoundIds.contains(round.getRoundId())) {
                continue;
            }
            List<RankingEntity> rankings = rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(round.getRoundId());
            if (rankings.isEmpty()) {
                continue;
            }
            boolean finalRound = Boolean.TRUE.equals(round.getFinalRound());

            Map<Integer, SubmissionEntity> submissionsByTeamId = submissionRepository.findByRoundRoundIdOrderByTeamTeamNameAsc(round.getRoundId())
                    .stream()
                    .collect(Collectors.toMap(item -> item.getTeam().getTeamId(), item -> item, (left, right) -> left, LinkedHashMap::new));

            Map<String, List<LeaderboardRowDto>> rowsByTrackKey = new LinkedHashMap<>();
            Map<String, Integer> trackIdsByKey = new LinkedHashMap<>();
            Map<String, String> trackNamesByKey = new LinkedHashMap<>();
            List<RankingEntity> displayRankings = finalRound
                    ? rankings.stream()
                    .sorted(Comparator
                            .comparing(RankingEntity::getTotalScore, Comparator.nullsLast(Comparator.reverseOrder()))
                            .thenComparing(item -> item.getTeam().getTeamName(), String.CASE_INSENSITIVE_ORDER))
                    .toList()
                    : rankings;
            int finalRankCounter = 0;

            for (RankingEntity ranking : displayRankings) {
                SubmissionEntity submission = submissionsByTeamId.get(ranking.getTeam().getTeamId());
                TeamPrizeEntity teamPrize = finalRound
                        ? finalAwardsByTeamId.get(ranking.getTeam().getTeamId())
                        : null;
                Integer trackId = finalRound ? null : ranking.getTeam().getTrack() == null ? null : ranking.getTeam().getTrack().getTrackId();
                String trackName = finalRound
                        ? "All finalists"
                        : ranking.getTeam().getTrack() == null ? "Unassigned track" : ranking.getTeam().getTrack().getName();
                String trackKey = String.valueOf(trackId) + "::" + trackName;
                trackIdsByKey.put(trackKey, trackId);
                trackNamesByKey.put(trackKey, trackName);
                Integer rankPosition = finalRound ? ++finalRankCounter : ranking.getRankPosition();
                rowsByTrackKey.computeIfAbsent(trackKey, ignored -> new ArrayList<>()).add(
                        new LeaderboardRowDto(
                                submission == null ? null : submission.getSubmissionId(),
                                ranking.getTeam().getTeamId(),
                                ranking.getTeam().getTeamName(),
                                ranking.getTotalScore(),
                                rankPosition,
                                ranking.getQualificationStatus(),
                                ranking.getQualificationNote(),
                                teamPrize == null ? null : teamPrize.getPrize().getPrizeName(),
                                teamPrize == null ? null : teamPrize.getPrize().getAmountVnd()
                        )
                );
            }

            for (Map.Entry<String, List<LeaderboardRowDto>> entry : rowsByTrackKey.entrySet()) {
                Integer trackId = trackIdsByKey.get(entry.getKey());
                if (viewerTeamId != null && !finalRound && !Objects.equals(trackId, viewerTrackId)) {
                    continue;
                }
                SubmissionScoreBreakdownDto teamBreakdown = entry.getValue().stream()
                        .filter(row -> Objects.equals(row.teamId(), viewerTeamId) && row.submissionId() != null)
                        .findFirst()
                        .map(row -> buildSubmissionScoreBreakdown(submissionsByTeamId.get(row.teamId()), includeJudgeScores))
                        .orElse(null);

                groups.add(new RoundTrackLeaderboardDto(
                        round.getRoundId(),
                        round.getRoundName(),
                        round.getRoundOrder(),
                        trackId,
                        trackNamesByKey.get(entry.getKey()),
                        entry.getValue(),
                        teamBreakdown
                ));
            }
        }

        return groups;
    }

    private SubmissionScoreBreakdownDto buildSubmissionScoreBreakdown(SubmissionEntity submission,
                                                                      boolean includeJudgeScores) {
        List<ScoringCriteriaEntity> criteria = criteriaRepository.findByRoundRoundIdOrderByCriteriaIdAsc(submission.getRound().getRoundId());
        List<JudgeEvaluationEntity> evaluations = judgeEvaluationRepository
                .findBySubmissionSubmissionIdOrderByJudgeAssignmentJudgeAssignmentIdAsc(submission.getSubmissionId());
        List<ScoreEntity> scores = scoreRepository
                .findBySubmissionSubmissionIdOrderByJudgeAssignmentJudgeAssignmentIdAscCriteriaCriteriaIdAsc(submission.getSubmissionId());

        Map<Integer, JudgeEvaluationEntity> evaluationByAssignmentId = evaluations.stream()
                .collect(Collectors.toMap(item -> item.getJudgeAssignment().getJudgeAssignmentId(), item -> item, (left, right) -> left, LinkedHashMap::new));
        Set<Integer> finalizedAssignmentIds = evaluations.stream()
                .filter(item -> "Finalized".equalsIgnoreCase(item.getStatus()))
                .map(item -> item.getJudgeAssignment().getJudgeAssignmentId())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Integer, List<ScoreEntity>> scoresByAssignmentId = scores.stream()
                .collect(Collectors.groupingBy(item -> item.getJudgeAssignment().getJudgeAssignmentId(), LinkedHashMap::new, Collectors.toList()));

        RankingEntity ranking = rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(submission.getRound().getRoundId())
                .stream()
                .filter(item -> item.getTeam().getTeamId().equals(submission.getTeam().getTeamId()))
                .findFirst()
                .orElse(null);

        List<SubmissionCriterionBreakdownDto> criterionBreakdowns = criteria.stream()
                .map(criteriaEntity -> new SubmissionCriterionBreakdownDto(
                        criteriaEntity.getCriteriaId(),
                        criteriaEntity.getCriteriaName(),
                        criteriaEntity.getWeight(),
                        averageCriterionScore(criteriaEntity.getCriteriaId(), scores, finalizedAssignmentIds)
                ))
                .toList();

        List<SubmissionJudgeScoreDto> judgeScoreBreakdowns = includeJudgeScores
                ? evaluations.stream()
                .map(evaluation -> toJudgeScoreDto(evaluation, criteria, scoresByAssignmentId.getOrDefault(
                        evaluation.getJudgeAssignment().getJudgeAssignmentId(),
                        List.of()
                )))
                .toList()
                : List.of();

        BigDecimal derivedTotal = averageJudgeTotals(
                criteria,
                finalizedAssignmentIds.stream()
                        .map(scoresByAssignmentId::get)
                        .filter(Objects::nonNull)
                        .toList()
        );

        return new SubmissionScoreBreakdownDto(
                submission.getSubmissionId(),
                submission.getTeam().getTeamId(),
                submission.getTeam().getTeamName(),
                submission.getRound().getRoundId(),
                submission.getRound().getRoundName(),
                submission.getTeam().getTrack() == null ? null : submission.getTeam().getTrack().getTrackId(),
                submission.getTeam().getTrack() == null ? "Unassigned track" : submission.getTeam().getTrack().getName(),
                ranking != null && ranking.getTotalScore() != null ? ranking.getTotalScore() : derivedTotal,
                ranking == null ? null : ranking.getRankPosition(),
                ranking == null ? null : ranking.getQualificationStatus(),
                ranking == null ? null : ranking.getQualificationNote(),
                criterionBreakdowns,
                judgeScoreBreakdowns,
                feedbackRepository.findBySubmissionSubmissionIdOrderByCreatedAtDesc(submission.getSubmissionId())
                        .stream()
                        .map(this::toFeedbackDto)
                        .toList()
        );
    }

    private SubmissionJudgeScoreDto toJudgeScoreDto(JudgeEvaluationEntity evaluation,
                                                    List<ScoringCriteriaEntity> criteria,
                                                    List<ScoreEntity> judgeScores) {
        Map<Integer, ScoreEntity> scoreByCriteriaId = judgeScores.stream()
                .collect(Collectors.toMap(item -> item.getCriteria().getCriteriaId(), item -> item, (left, right) -> left, LinkedHashMap::new));

        List<SubmissionJudgeCriterionScoreDto> criterionScores = criteria.stream()
                .map(criteriaEntity -> {
                    ScoreEntity score = scoreByCriteriaId.get(criteriaEntity.getCriteriaId());
                    return new SubmissionJudgeCriterionScoreDto(
                            criteriaEntity.getCriteriaId(),
                            criteriaEntity.getCriteriaName(),
                            criteriaEntity.getWeight(),
                            score == null ? null : score.getScoreValue(),
                            score == null ? null : score.getComment()
                    );
                })
                .toList();

        return new SubmissionJudgeScoreDto(
                evaluation.getJudgeAssignment().getJudgeAssignmentId(),
                evaluation.getJudgeAssignment().getJudgeRole().getUserRoleId(),
                evaluation.getJudgeAssignment().getJudgeRole().getUser().getFullName(),
                hasCompleteCriteria(criteria, judgeScores) ? weightedTotal(criteria, judgeScores) : null,
                "Finalized".equalsIgnoreCase(evaluation.getStatus()),
                evaluation.getFinalizedAt(),
                criterionScores
        );
    }

    private BigDecimal averageCriterionScore(Integer criteriaId,
                                             List<ScoreEntity> scores,
                                             Set<Integer> finalizedAssignmentIds) {
        List<BigDecimal> values = scores.stream()
                .filter(item -> finalizedAssignmentIds.contains(item.getJudgeAssignment().getJudgeAssignmentId()))
                .filter(item -> item.getCriteria().getCriteriaId().equals(criteriaId))
                .map(ScoreEntity::getScoreValue)
                .filter(Objects::nonNull)
                .toList();
        return average(values);
    }

    private BigDecimal averageJudgeTotals(List<ScoringCriteriaEntity> criteria,
                                          Collection<List<ScoreEntity>> judgeScoreSets) {
        List<BigDecimal> totals = judgeScoreSets.stream()
                .filter(Objects::nonNull)
                .filter(scores -> hasCompleteCriteria(criteria, scores))
                .map(scores -> weightedTotal(criteria, scores))
                .filter(Objects::nonNull)
                .toList();
        return average(totals);
    }

    private boolean hasCompleteCriteria(List<ScoringCriteriaEntity> criteria,
                                        List<ScoreEntity> scores) {
        Set<Integer> scoredCriteriaIds = scores.stream()
                .map(item -> item.getCriteria().getCriteriaId())
                .collect(Collectors.toSet());
        return criteria.stream().map(ScoringCriteriaEntity::getCriteriaId).allMatch(scoredCriteriaIds::contains);
    }

    private BigDecimal weightedTotal(List<ScoringCriteriaEntity> criteria,
                                     List<ScoreEntity> scores) {
        Map<Integer, ScoreEntity> scoreByCriteriaId = scores.stream()
                .collect(Collectors.toMap(item -> item.getCriteria().getCriteriaId(), item -> item, (left, right) -> left));

        BigDecimal total = BigDecimal.ZERO;
        for (ScoringCriteriaEntity criteriaEntity : criteria) {
            ScoreEntity score = scoreByCriteriaId.get(criteriaEntity.getCriteriaId());
            if (score == null || score.getScoreValue() == null || criteriaEntity.getWeight() == null) {
                return null;
            }
            total = total.add(
                    score.getScoreValue()
                            .multiply(criteriaEntity.getWeight())
                            .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)
            );
        }
        return total.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal average(List<BigDecimal> values) {
        if (values.isEmpty()) {
            return null;
        }
        BigDecimal sum = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    private FeedbackDto toFeedbackDto(FeedbackEntity feedback) {
        return new FeedbackDto(
                feedback.getFeedbackId(),
                feedback.getSubmission().getSubmissionId(),
                feedback.getAuthorRole() == null ? null : feedback.getAuthorRole().getUserRoleId(),
                feedback.getAuthorRole() == null || feedback.getAuthorRole().getUser() == null
                        ? "Unknown"
                        : feedback.getAuthorRole().getUser().getFullName(),
                feedback.getAuthorRoleType(),
                feedback.getFeedbackText(),
                feedback.getCreatedAt()
        );
    }

    private Set<Integer> resolvePublishedRoundIds(HackathonEventEntity event, List<RoundEntity> rounds) {
        if (event == null || rounds == null || rounds.isEmpty()) {
            return Set.of();
        }
        if ("Ended".equalsIgnoreCase(event.getStatus())) {
            return rounds.stream()
                    .map(RoundEntity::getRoundId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
        }
        List<Integer> roundIds = rounds.stream()
                .map(RoundEntity::getRoundId)
                .filter(Objects::nonNull)
                .toList();
        return auditLogRepository.findByActionTypeAndTargetEntityAndTargetIdInOrderByTimestampDesc(
                        ACTION_ROUND_RESULTS_PUBLISHED,
                        TARGET_ENTITY_ROUND,
                        roundIds
                )
                .stream()
                .map(AuditLogEntity::getTargetId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private java.time.LocalDateTime resolveLatestPublishedAt(HackathonEventEntity event,
                                                             List<RoundEntity> rounds,
                                                             Set<Integer> publishedRoundIds) {
        if (event == null || publishedRoundIds == null || publishedRoundIds.isEmpty()) {
            return null;
        }
        if ("Ended".equalsIgnoreCase(event.getStatus())) {
            return event.getPublishedAt();
        }
        return rounds.stream()
                .filter(round -> publishedRoundIds.contains(round.getRoundId()))
                .map(round -> auditLogRepository.findTopByActionTypeAndTargetEntityAndTargetIdOrderByTimestampDesc(
                        ACTION_ROUND_RESULTS_PUBLISHED,
                        TARGET_ENTITY_ROUND,
                        round.getRoundId()
                ).map(AuditLogEntity::getTimestamp).orElse((java.time.LocalDateTime) null))
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
    }
}
