package com.seal.hackathon.evaluation;

import com.seal.hackathon.auth.entity.RoleType;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserRoleEntity;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.auth.repository.UserRoleRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.evaluation.dto.FinalizationSubmissionDto;
import com.seal.hackathon.evaluation.dto.ManualEliminationRequest;
import com.seal.hackathon.evaluation.dto.RoundFinalizationDto;
import com.seal.hackathon.evaluation.entity.JudgeAssignmentEntity;
import com.seal.hackathon.evaluation.entity.JudgeEvaluationEntity;
import com.seal.hackathon.evaluation.entity.RankingEntity;
import com.seal.hackathon.evaluation.entity.RankingQualificationStatus;
import com.seal.hackathon.evaluation.entity.ScoreEntity;
import com.seal.hackathon.evaluation.entity.ScoringCriteriaEntity;
import com.seal.hackathon.evaluation.repository.AuditLogRepository;
import com.seal.hackathon.evaluation.repository.CriteriaTemplateRepository;
import com.seal.hackathon.evaluation.repository.JudgeAssignmentRepository;
import com.seal.hackathon.evaluation.repository.JudgeEvaluationRepository;
import com.seal.hackathon.evaluation.repository.RankingRepository;
import com.seal.hackathon.evaluation.repository.ScoreRepository;
import com.seal.hackathon.evaluation.repository.ScoringCriteriaRepository;
import com.seal.hackathon.evaluation.service.AuditLogService;
import com.seal.hackathon.evaluation.service.CoordinatorScoringService;
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
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoordinatorScoringServiceTest {

    private static final int TEST_DISQUALIFIED_RANK_BASE = 1_000_000;

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserRoleRepository userRoleRepository;
    @Mock
    private HackathonEventRepository eventRepository;
    @Mock
    private RoundRepository roundRepository;
    @Mock
    private TrackRepository trackRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private SubmissionRepository submissionRepository;
    @Mock
    private ScoringCriteriaRepository criteriaRepository;
    @Mock
    private CriteriaTemplateRepository criteriaTemplateRepository;
    @Mock
    private JudgeAssignmentRepository judgeAssignmentRepository;
    @Mock
    private JudgeEvaluationRepository judgeEvaluationRepository;
    @Mock
    private ScoreRepository scoreRepository;
    @Mock
    private RankingRepository rankingRepository;
    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private CoordinatorScoringService coordinatorScoringService;

    @Test
    void getRoundFinalization_shouldRankTeamsPerTrackAndExposeQualificationPlaceholders() {
        RankingFixture fixture = seedRankingFixture(false);
        mockCommonLookups(fixture);
        when(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(fixture.round.getRoundId())).thenReturn(List.of());

        RoundFinalizationDto dto = coordinatorScoringService.getRoundFinalization(
                auth(fixture.coordinator.getEmail()),
                fixture.round.getRoundId()
        );

        Assertions.assertEquals(fixture.nextRound.getRoundId(), dto.nextRoundId());
        Assertions.assertEquals("Semi Final", dto.nextRoundName());
        Assertions.assertFalse(dto.qualificationCalculated());
        Assertions.assertFalse(dto.advancementApplied());
        Assertions.assertTrue(dto.qualificationNote().contains("Finalize this round first")
                || dto.qualificationNote().contains("Run qualification calculation"));

        FinalizationSubmissionDto alpha = byTeamName(dto.submissions(), "Alpha");
        FinalizationSubmissionDto beta = byTeamName(dto.submissions(), "Beta");
        FinalizationSubmissionDto gamma = byTeamName(dto.submissions(), "Gamma");

        Assertions.assertEquals(1, alpha.rankPosition());
        Assertions.assertEquals(new BigDecimal("90.00"), alpha.totalScore());
        Assertions.assertEquals(Boolean.TRUE, alpha.projectedQualifiedNextRound());
        Assertions.assertEquals(RankingQualificationStatus.PENDING.getDbValue(), alpha.qualificationStatus());
        Assertions.assertFalse(alpha.qualifiedNextRound());

        Assertions.assertEquals(2, beta.rankPosition());
        Assertions.assertEquals(Boolean.FALSE, beta.projectedQualifiedNextRound());
        Assertions.assertTrue(beta.qualificationNote().contains("below the projected"));

        Assertions.assertEquals(1, gamma.rankPosition());
        Assertions.assertEquals(new BigDecimal("76.00"), gamma.totalScore());
        Assertions.assertEquals(Boolean.TRUE, gamma.projectedQualifiedNextRound());
    }

    @Test
    void finalizeRoundScores_shouldPersistRankingsWithoutPromotingOrEliminatingTeams() {
        RankingFixture fixture = seedRankingFixture(false);
        mockCommonLookups(fixture);
        AtomicReference<List<RankingEntity>> savedRankings = new AtomicReference<>(List.of());

        when(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(fixture.round.getRoundId()))
                .thenAnswer(invocation -> savedRankings.get());
        when(rankingRepository.saveAll(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<RankingEntity> rankings = new ArrayList<>((List<RankingEntity>) invocation.getArgument(0));
            savedRankings.set(rankings);
            return rankings;
        });
        when(roundRepository.save(any(RoundEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RoundFinalizationDto dto = coordinatorScoringService.finalizeRoundScores(
                auth(fixture.coordinator.getEmail()),
                fixture.round.getRoundId()
        );

        Assertions.assertTrue(dto.scoreLocked());
        Assertions.assertFalse(dto.qualificationCalculated());
        verify(submissionRepository, never()).saveAll(any());

        ArgumentCaptor<List<RankingEntity>> rankingCaptor = ArgumentCaptor.forClass(List.class);
        verify(rankingRepository).saveAll(rankingCaptor.capture());
        List<RankingEntity> saved = rankingCaptor.getValue();
        Assertions.assertEquals(3, saved.size());
        Assertions.assertTrue(saved.stream().allMatch(item -> !Boolean.TRUE.equals(item.getQualifiedNextRound())));
        Assertions.assertTrue(saved.stream().allMatch(item -> RankingQualificationStatus.PENDING.getDbValue().equals(item.getQualificationStatus())));
        Assertions.assertEquals(1, rankingByTeamName(saved, "Alpha").getRankPosition());
        Assertions.assertEquals(2, rankingByTeamName(saved, "Beta").getRankPosition());
        Assertions.assertEquals(1, rankingByTeamName(saved, "Gamma").getRankPosition());
        Assertions.assertEquals(SubmissionStatus.SUBMITTED.getDbValue(), fixture.alpha.getStatus());
        Assertions.assertEquals(SubmissionStatus.SUBMITTED.getDbValue(), fixture.beta.getStatus());
        Assertions.assertEquals(SubmissionStatus.SUBMITTED.getDbValue(), fixture.gamma.getStatus());
    }

    @Test
    void calculateRoundQualification_shouldMarkTopTeamsAsQualifiedAndUpdateSubmissionStatuses() {
        RankingFixture fixture = seedRankingFixture(false);
        fixture.round.setScoreLocked(true);
        mockCommonLookups(fixture);

        RankingEntity alphaRanking = ranking(fixture.round, fixture.alpha.getTeam(), 1, "90.00");
        RankingEntity betaRanking = ranking(fixture.round, fixture.beta.getTeam(), 2, "82.00");
        RankingEntity gammaRanking = ranking(fixture.round, fixture.gamma.getTeam(), 1, "76.00");
        List<RankingEntity> persistedRankings = new ArrayList<>(List.of(alphaRanking, betaRanking, gammaRanking));

        when(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(fixture.round.getRoundId()))
                .thenAnswer(invocation -> persistedRankings);
        when(rankingRepository.saveAll(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<RankingEntity> saved = new ArrayList<>((List<RankingEntity>) invocation.getArgument(0));
            persistedRankings.clear();
            persistedRankings.addAll(saved);
            return saved;
        });
        RoundFinalizationDto dto = coordinatorScoringService.calculateRoundQualification(
                auth(fixture.coordinator.getEmail()),
                fixture.round.getRoundId()
        );

        Assertions.assertTrue(dto.qualificationCalculated());
        Assertions.assertFalse(dto.advancementApplied());
        Assertions.assertTrue(dto.qualificationNote().contains("Apply promotion"));

        Assertions.assertFalse(alphaRanking.getQualifiedNextRound());
        Assertions.assertEquals(RankingQualificationStatus.QUALIFIED.getDbValue(), alphaRanking.getQualificationStatus());
        Assertions.assertTrue(alphaRanking.getQualificationNote().contains("Top 1"));
        Assertions.assertNotNull(alphaRanking.getQualificationCalculatedAt());

        Assertions.assertFalse(betaRanking.getQualifiedNextRound());
        Assertions.assertEquals(RankingQualificationStatus.ELIMINATED.getDbValue(), betaRanking.getQualificationStatus());
        Assertions.assertTrue(betaRanking.getQualificationNote().contains("Marked for elimination"));
        Assertions.assertNotNull(betaRanking.getQualificationCalculatedAt());

        Assertions.assertFalse(gammaRanking.getQualifiedNextRound());
        Assertions.assertEquals(RankingQualificationStatus.QUALIFIED.getDbValue(), gammaRanking.getQualificationStatus());

        Assertions.assertEquals(SubmissionStatus.SUBMITTED.getDbValue(), fixture.alpha.getStatus());
        Assertions.assertEquals(SubmissionStatus.SUBMITTED.getDbValue(), fixture.beta.getStatus());
        Assertions.assertEquals(SubmissionStatus.SUBMITTED.getDbValue(), fixture.gamma.getStatus());

        FinalizationSubmissionDto alpha = byTeamName(dto.submissions(), "Alpha");
        FinalizationSubmissionDto beta = byTeamName(dto.submissions(), "Beta");
        Assertions.assertFalse(alpha.qualifiedNextRound());
        Assertions.assertEquals(RankingQualificationStatus.QUALIFIED.getDbValue(), alpha.qualificationStatus());
        Assertions.assertEquals(RankingQualificationStatus.ELIMINATED.getDbValue(), beta.qualificationStatus());
    }

    @Test
    void applyRoundAdvancement_shouldPromoteQualifiedTeamsAndEliminateTheRest() {
        RankingFixture fixture = seedRankingFixture(false);
        fixture.round.setScoreLocked(true);
        mockCommonLookups(fixture);

        RankingEntity alphaRanking = ranking(fixture.round, fixture.alpha.getTeam(), 1, "90.00");
        alphaRanking.setQualificationStatus(RankingQualificationStatus.QUALIFIED.getDbValue());
        RankingEntity betaRanking = ranking(fixture.round, fixture.beta.getTeam(), 2, "82.00");
        betaRanking.setQualificationStatus(RankingQualificationStatus.ELIMINATED.getDbValue());
        RankingEntity gammaRanking = ranking(fixture.round, fixture.gamma.getTeam(), 1, "76.00");
        gammaRanking.setQualificationStatus(RankingQualificationStatus.QUALIFIED.getDbValue());
        List<RankingEntity> persistedRankings = new ArrayList<>(List.of(alphaRanking, betaRanking, gammaRanking));

        when(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(fixture.round.getRoundId()))
                .thenAnswer(invocation -> persistedRankings);
        when(rankingRepository.saveAll(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<RankingEntity> saved = new ArrayList<>((List<RankingEntity>) invocation.getArgument(0));
            persistedRankings.clear();
            persistedRankings.addAll(saved);
            return saved;
        });
        when(submissionRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        RoundFinalizationDto dto = coordinatorScoringService.applyRoundAdvancement(
                auth(fixture.coordinator.getEmail()),
                fixture.round.getRoundId()
        );

        Assertions.assertTrue(dto.qualificationCalculated());
        Assertions.assertTrue(dto.advancementApplied());
        Assertions.assertTrue(dto.advancementNote().contains("Qualified teams can now submit"));

        Assertions.assertTrue(alphaRanking.getQualifiedNextRound());
        Assertions.assertFalse(betaRanking.getQualifiedNextRound());
        Assertions.assertTrue(gammaRanking.getQualifiedNextRound());

        Assertions.assertEquals(SubmissionStatus.QUALIFIED.getDbValue(), fixture.alpha.getStatus());
        Assertions.assertEquals(SubmissionStatus.ELIMINATED.getDbValue(), fixture.beta.getStatus());
        Assertions.assertEquals(SubmissionStatus.QUALIFIED.getDbValue(), fixture.gamma.getStatus());

        FinalizationSubmissionDto alpha = byTeamName(dto.submissions(), "Alpha");
        FinalizationSubmissionDto beta = byTeamName(dto.submissions(), "Beta");
        Assertions.assertTrue(alpha.qualifiedNextRound());
        Assertions.assertEquals(RankingQualificationStatus.QUALIFIED.getDbValue(), alpha.qualificationStatus());
        Assertions.assertEquals(RankingQualificationStatus.ELIMINATED.getDbValue(), beta.qualificationStatus());
    }

    @Test
    void reopenRoundFinalization_shouldRejectAfterAdvancementHasBeenApplied() {
        RankingFixture fixture = seedRankingFixture(false);
        fixture.round.setScoreLocked(true);
        when(userRepository.findByEmailIgnoreCase(fixture.coordinator.getEmail())).thenReturn(Optional.of(fixture.coordinator));
        when(userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(
                fixture.coordinator.getUserId(),
                RoleType.COORDINATOR.getDbValue()
        )).thenReturn(Optional.of(fixture.coordinatorRole));
        when(roundRepository.findById(fixture.round.getRoundId())).thenReturn(Optional.of(fixture.round));

        RankingEntity alphaRanking = ranking(fixture.round, fixture.alpha.getTeam(), 1, "90.00");
        alphaRanking.setQualificationStatus(RankingQualificationStatus.QUALIFIED.getDbValue());
        alphaRanking.setQualifiedNextRound(true);
        RankingEntity betaRanking = ranking(fixture.round, fixture.beta.getTeam(), 2, "82.00");
        betaRanking.setQualificationStatus(RankingQualificationStatus.ELIMINATED.getDbValue());
        betaRanking.setQualifiedNextRound(false);
        RankingEntity gammaRanking = ranking(fixture.round, fixture.gamma.getTeam(), 1, "76.00");
        gammaRanking.setQualificationStatus(RankingQualificationStatus.QUALIFIED.getDbValue());
        gammaRanking.setQualifiedNextRound(true);

        fixture.alpha.setStatus(SubmissionStatus.QUALIFIED.getDbValue());
        fixture.beta.setStatus(SubmissionStatus.ELIMINATED.getDbValue());
        fixture.gamma.setStatus(SubmissionStatus.QUALIFIED.getDbValue());

        when(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(fixture.round.getRoundId()))
                .thenReturn(List.of(alphaRanking, betaRanking, gammaRanking));
        when(submissionRepository.findByRoundRoundIdOrderByTeamTeamNameAsc(fixture.round.getRoundId()))
                .thenReturn(List.of(fixture.alpha, fixture.beta, fixture.gamma));

        ApiException exception = Assertions.assertThrows(
                ApiException.class,
                () -> coordinatorScoringService.reopenRoundFinalization(
                        auth(fixture.coordinator.getEmail()),
                        fixture.round.getRoundId()
                )
        );

        Assertions.assertTrue(exception.getMessage().contains("promotion to the next round has already been applied"));
    }

    @Test
    void manuallyDisqualifySubmission_shouldRequireReasonAndRecalculateTrackRanking() {
        RankingFixture fixture = seedRankingFixture(false);
        fixture.round.setScoreLocked(true);
        mockCommonLookups(fixture);

        RankingEntity alphaRanking = ranking(fixture.round, fixture.alpha.getTeam(), 1, "90.00");
        alphaRanking.setQualificationStatus(RankingQualificationStatus.QUALIFIED.getDbValue());
        RankingEntity betaRanking = ranking(fixture.round, fixture.beta.getTeam(), 2, "82.00");
        betaRanking.setQualificationStatus(RankingQualificationStatus.ELIMINATED.getDbValue());
        RankingEntity gammaRanking = ranking(fixture.round, fixture.gamma.getTeam(), 1, "76.00");
        gammaRanking.setQualificationStatus(RankingQualificationStatus.QUALIFIED.getDbValue());
        List<RankingEntity> persistedRankings = new ArrayList<>(List.of(alphaRanking, betaRanking, gammaRanking));

        when(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(fixture.round.getRoundId()))
                .thenAnswer(invocation -> persistedRankings);
        when(rankingRepository.saveAll(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<RankingEntity> saved = new ArrayList<>((List<RankingEntity>) invocation.getArgument(0));
            persistedRankings.clear();
            persistedRankings.addAll(saved);
            return saved;
        });
        when(submissionRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        RoundFinalizationDto dto = coordinatorScoringService.manuallyDisqualifySubmission(
                auth(fixture.coordinator.getEmail()),
                fixture.round.getRoundId(),
                fixture.alpha.getSubmissionId(),
                new ManualEliminationRequest("Broke contest rules")
        );

        Assertions.assertFalse(dto.qualificationCalculated());
        Assertions.assertFalse(dto.advancementApplied());

        Assertions.assertEquals(RankingQualificationStatus.DISQUALIFIED.getDbValue(), alphaRanking.getQualificationStatus());
        Assertions.assertTrue(alphaRanking.getQualificationNote().contains("Broke contest rules"));
        Assertions.assertEquals(SubmissionStatus.DISQUALIFIED.getDbValue(), fixture.alpha.getStatus());

        Assertions.assertEquals(1, betaRanking.getRankPosition());
        Assertions.assertEquals(RankingQualificationStatus.PENDING.getDbValue(), betaRanking.getQualificationStatus());
        Assertions.assertTrue(betaRanking.getQualificationNote().contains("Manual disqualification changed the ranking"));

        Assertions.assertEquals(RankingQualificationStatus.QUALIFIED.getDbValue(), gammaRanking.getQualificationStatus());
        Assertions.assertEquals(1, gammaRanking.getRankPosition());

        FinalizationSubmissionDto alpha = byTeamName(dto.submissions(), "Alpha");
        FinalizationSubmissionDto beta = byTeamName(dto.submissions(), "Beta");
        FinalizationSubmissionDto gamma = byTeamName(dto.submissions(), "Gamma");
        Assertions.assertNull(alpha.rankPosition());
        Assertions.assertEquals(RankingQualificationStatus.DISQUALIFIED.getDbValue(), alpha.qualificationStatus());
        Assertions.assertEquals(1, beta.rankPosition());
        Assertions.assertEquals(RankingQualificationStatus.PENDING.getDbValue(), beta.qualificationStatus());
        Assertions.assertEquals(1, gamma.rankPosition());
    }

    @Test
    void manuallyDisqualifySubmission_shouldAllowBeforeFinalization() {
        RankingFixture fixture = seedRankingFixture(false);
        fixture.round.setScoreLocked(false);
        mockCommonLookups(fixture);

        List<RankingEntity> persistedRankings = new ArrayList<>();
        when(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(fixture.round.getRoundId()))
                .thenAnswer(invocation -> persistedRankings);
        when(rankingRepository.saveAll(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<RankingEntity> saved = new ArrayList<>((List<RankingEntity>) invocation.getArgument(0));
            persistedRankings.clear();
            persistedRankings.addAll(saved);
            return saved;
        });
        when(submissionRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        RoundFinalizationDto dto = coordinatorScoringService.manuallyDisqualifySubmission(
                auth(fixture.coordinator.getEmail()),
                fixture.round.getRoundId(),
                fixture.alpha.getSubmissionId(),
                new ManualEliminationRequest("Academic misconduct")
        );

        FinalizationSubmissionDto alpha = byTeamName(dto.submissions(), "Alpha");
        FinalizationSubmissionDto beta = byTeamName(dto.submissions(), "Beta");
        Assertions.assertEquals(RankingQualificationStatus.DISQUALIFIED.getDbValue(), alpha.qualificationStatus());
        Assertions.assertNull(alpha.rankPosition());
        Assertions.assertEquals(SubmissionStatus.DISQUALIFIED.getDbValue(), fixture.alpha.getStatus());
        Assertions.assertEquals(1, beta.rankPosition());
        Assertions.assertFalse(dto.scoreLocked());
    }

    @Test
    void manuallyDisqualifySubmission_shouldRejectAfterAdvancementApplied() {
        RankingFixture fixture = seedRankingFixture(false);
        fixture.round.setScoreLocked(true);
        when(userRepository.findByEmailIgnoreCase(fixture.coordinator.getEmail())).thenReturn(Optional.of(fixture.coordinator));
        when(userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(
                fixture.coordinator.getUserId(),
                RoleType.COORDINATOR.getDbValue()
        )).thenReturn(Optional.of(fixture.coordinatorRole));
        when(roundRepository.findById(fixture.round.getRoundId())).thenReturn(Optional.of(fixture.round));

        RankingEntity alphaRanking = ranking(fixture.round, fixture.alpha.getTeam(), 1, "90.00");
        alphaRanking.setQualificationStatus(RankingQualificationStatus.QUALIFIED.getDbValue());
        alphaRanking.setQualifiedNextRound(true);
        RankingEntity betaRanking = ranking(fixture.round, fixture.beta.getTeam(), 2, "82.00");
        betaRanking.setQualificationStatus(RankingQualificationStatus.ELIMINATED.getDbValue());
        betaRanking.setQualifiedNextRound(false);
        RankingEntity gammaRanking = ranking(fixture.round, fixture.gamma.getTeam(), 1, "76.00");
        gammaRanking.setQualificationStatus(RankingQualificationStatus.QUALIFIED.getDbValue());
        gammaRanking.setQualifiedNextRound(true);

        fixture.alpha.setStatus(SubmissionStatus.QUALIFIED.getDbValue());
        fixture.beta.setStatus(SubmissionStatus.ELIMINATED.getDbValue());
        fixture.gamma.setStatus(SubmissionStatus.QUALIFIED.getDbValue());

        when(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(fixture.round.getRoundId()))
                .thenReturn(List.of(alphaRanking, betaRanking, gammaRanking));
        when(submissionRepository.findByRoundRoundIdOrderByTeamTeamNameAsc(fixture.round.getRoundId()))
                .thenReturn(List.of(fixture.alpha, fixture.beta, fixture.gamma));

        ApiException exception = Assertions.assertThrows(
                ApiException.class,
                () -> coordinatorScoringService.manuallyDisqualifySubmission(
                        auth(fixture.coordinator.getEmail()),
                        fixture.round.getRoundId(),
                        fixture.alpha.getSubmissionId(),
                        new ManualEliminationRequest("Late cheating report")
                )
        );

        Assertions.assertTrue(exception.getMessage().contains("Manual disqualification is locked"));
    }

    @Test
    void undoManualDisqualification_shouldRestoreTeamBeforePromotion() {
        RankingFixture fixture = seedRankingFixture(false);
        fixture.round.setScoreLocked(true);
        mockCommonLookups(fixture);

        RankingEntity alphaRanking = ranking(fixture.round, fixture.alpha.getTeam(), TEST_DISQUALIFIED_RANK_BASE, "90.00");
        alphaRanking.setQualificationStatus(RankingQualificationStatus.DISQUALIFIED.getDbValue());
        alphaRanking.setQualificationNote("Disqualified: Cheating");
        alphaRanking.setQualificationCalculatedAt(LocalDateTime.now());
        RankingEntity betaRanking = ranking(fixture.round, fixture.beta.getTeam(), 1, "82.00");
        betaRanking.setQualificationStatus(RankingQualificationStatus.ELIMINATED.getDbValue());
        betaRanking.setQualifiedNextRound(false);
        RankingEntity gammaRanking = ranking(fixture.round, fixture.gamma.getTeam(), 1, "76.00");
        gammaRanking.setQualificationStatus(RankingQualificationStatus.QUALIFIED.getDbValue());
        gammaRanking.setQualifiedNextRound(false);
        List<RankingEntity> persistedRankings = new ArrayList<>(List.of(alphaRanking, betaRanking, gammaRanking));

        fixture.alpha.setStatus(SubmissionStatus.DISQUALIFIED.getDbValue());

        when(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(fixture.round.getRoundId()))
                .thenAnswer(invocation -> persistedRankings);
        when(rankingRepository.saveAll(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<RankingEntity> saved = new ArrayList<>((List<RankingEntity>) invocation.getArgument(0));
            persistedRankings.clear();
            persistedRankings.addAll(saved);
            return saved;
        });
        when(submissionRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(scoreRepository.existsBySubmissionSubmissionId(fixture.alpha.getSubmissionId())).thenReturn(true);

        RoundFinalizationDto dto = coordinatorScoringService.undoManualDisqualification(
                auth(fixture.coordinator.getEmail()),
                fixture.round.getRoundId(),
                fixture.alpha.getSubmissionId()
        );

        Assertions.assertFalse(dto.qualificationCalculated());
        Assertions.assertFalse(dto.advancementApplied());
        Assertions.assertEquals(1, alphaRanking.getRankPosition());
        Assertions.assertEquals(RankingQualificationStatus.PENDING.getDbValue(), alphaRanking.getQualificationStatus());
        Assertions.assertEquals(2, betaRanking.getRankPosition());
        Assertions.assertEquals(RankingQualificationStatus.PENDING.getDbValue(), betaRanking.getQualificationStatus());
        Assertions.assertEquals(SubmissionStatus.EVALUATING.getDbValue(), fixture.alpha.getStatus());

        FinalizationSubmissionDto alpha = byTeamName(dto.submissions(), "Alpha");
        FinalizationSubmissionDto beta = byTeamName(dto.submissions(), "Beta");
        Assertions.assertEquals(1, alpha.rankPosition());
        Assertions.assertEquals(RankingQualificationStatus.PENDING.getDbValue(), alpha.qualificationStatus());
        Assertions.assertEquals(2, beta.rankPosition());
    }

    @Test
    void undoManualDisqualification_shouldDeleteDraftMarkerBeforeFinalization() {
        RankingFixture fixture = seedRankingFixture(false);
        fixture.round.setScoreLocked(false);
        mockCommonLookups(fixture);

        RankingEntity alphaRanking = ranking(fixture.round, fixture.alpha.getTeam(), TEST_DISQUALIFIED_RANK_BASE, "90.00");
        alphaRanking.setQualificationStatus(RankingQualificationStatus.DISQUALIFIED.getDbValue());
        alphaRanking.setQualificationNote("Disqualified: Cheating");
        List<RankingEntity> persistedRankings = new ArrayList<>(List.of(alphaRanking));

        fixture.alpha.setStatus(SubmissionStatus.DISQUALIFIED.getDbValue());

        when(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(fixture.round.getRoundId()))
                .thenAnswer(invocation -> persistedRankings);
        doAnswer(invocation -> {
            persistedRankings.remove(alphaRanking);
            return null;
        }).when(rankingRepository).delete(alphaRanking);
        when(submissionRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(scoreRepository.existsBySubmissionSubmissionId(fixture.alpha.getSubmissionId())).thenReturn(false);
        when(judgeEvaluationRepository.existsBySubmissionSubmissionId(fixture.alpha.getSubmissionId())).thenReturn(false);

        RoundFinalizationDto dto = coordinatorScoringService.undoManualDisqualification(
                auth(fixture.coordinator.getEmail()),
                fixture.round.getRoundId(),
                fixture.alpha.getSubmissionId()
        );

        verify(rankingRepository).delete(alphaRanking);
        Assertions.assertEquals(SubmissionStatus.SUBMITTED.getDbValue(), fixture.alpha.getStatus());

        FinalizationSubmissionDto alpha = byTeamName(dto.submissions(), "Alpha");
        Assertions.assertEquals(1, alpha.rankPosition());
        Assertions.assertNotEquals(RankingQualificationStatus.DISQUALIFIED.getDbValue(), alpha.qualificationStatus());
        Assertions.assertFalse(dto.scoreLocked());
    }

    @Test
    void undoManualDisqualification_shouldRejectAfterAdvancementApplied() {
        RankingFixture fixture = seedRankingFixture(false);
        fixture.round.setScoreLocked(true);
        when(userRepository.findByEmailIgnoreCase(fixture.coordinator.getEmail())).thenReturn(Optional.of(fixture.coordinator));
        when(userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(
                fixture.coordinator.getUserId(),
                RoleType.COORDINATOR.getDbValue()
        )).thenReturn(Optional.of(fixture.coordinatorRole));
        when(roundRepository.findById(fixture.round.getRoundId())).thenReturn(Optional.of(fixture.round));

        RankingEntity alphaRanking = ranking(fixture.round, fixture.alpha.getTeam(), TEST_DISQUALIFIED_RANK_BASE, "90.00");
        alphaRanking.setQualificationStatus(RankingQualificationStatus.DISQUALIFIED.getDbValue());
        alphaRanking.setQualifiedNextRound(false);
        RankingEntity betaRanking = ranking(fixture.round, fixture.beta.getTeam(), 1, "82.00");
        betaRanking.setQualificationStatus(RankingQualificationStatus.ELIMINATED.getDbValue());
        betaRanking.setQualifiedNextRound(false);
        RankingEntity gammaRanking = ranking(fixture.round, fixture.gamma.getTeam(), 1, "76.00");
        gammaRanking.setQualificationStatus(RankingQualificationStatus.QUALIFIED.getDbValue());
        gammaRanking.setQualifiedNextRound(true);

        fixture.alpha.setStatus(SubmissionStatus.DISQUALIFIED.getDbValue());
        fixture.beta.setStatus(SubmissionStatus.ELIMINATED.getDbValue());
        fixture.gamma.setStatus(SubmissionStatus.QUALIFIED.getDbValue());

        when(rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(fixture.round.getRoundId()))
                .thenReturn(List.of(alphaRanking, betaRanking, gammaRanking));
        when(submissionRepository.findByRoundRoundIdOrderByTeamTeamNameAsc(fixture.round.getRoundId()))
                .thenReturn(List.of(fixture.alpha, fixture.beta, fixture.gamma));

        ApiException exception = Assertions.assertThrows(
                ApiException.class,
                () -> coordinatorScoringService.undoManualDisqualification(
                        auth(fixture.coordinator.getEmail()),
                        fixture.round.getRoundId(),
                        fixture.alpha.getSubmissionId()
                )
        );

        Assertions.assertTrue(exception.getMessage().contains("Undo disqualification is locked"));
    }

    private void mockCommonLookups(RankingFixture fixture) {
        when(userRepository.findByEmailIgnoreCase(fixture.coordinator.getEmail())).thenReturn(Optional.of(fixture.coordinator));
        when(userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(
                fixture.coordinator.getUserId(),
                RoleType.COORDINATOR.getDbValue()
        )).thenReturn(Optional.of(fixture.coordinatorRole));
        when(roundRepository.findById(fixture.round.getRoundId())).thenReturn(Optional.of(fixture.round));
        when(roundRepository.findByEventIdAndRoundOrder(fixture.round.getEventId(), fixture.round.getRoundOrder() + 1))
                .thenReturn(Optional.of(fixture.nextRound));
        when(eventRepository.findById(fixture.event.getEventId())).thenReturn(Optional.of(fixture.event));
        when(criteriaRepository.findByRoundRoundIdOrderByCriteriaIdAsc(fixture.round.getRoundId())).thenReturn(fixture.criteria);
        when(submissionRepository.findByRoundRoundIdOrderByTeamTeamNameAsc(fixture.round.getRoundId()))
                .thenReturn(List.of(fixture.alpha, fixture.beta, fixture.gamma));
        when(judgeAssignmentRepository.findByRoundRoundIdOrderByTrackAndJudge(fixture.round.getRoundId()))
                .thenReturn(fixture.assignments);
        when(judgeEvaluationRepository.findBySubmissionRoundRoundId(fixture.round.getRoundId()))
                .thenReturn(fixture.evaluations);
        when(scoreRepository.findBySubmissionRoundRoundId(fixture.round.getRoundId()))
                .thenReturn(fixture.scores);
    }

    private RankingFixture seedRankingFixture(boolean finalRound) {
        UserEntity coordinator = user("coordinator@seal.test", 10);
        UserRoleEntity coordinatorRole = role(100, coordinator, RoleType.COORDINATOR);
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(501);
        event.setName("SEAL Summer 2026");
        event.setStatus("Ongoing");

        RoundEntity round = new RoundEntity();
        round.setRoundId(40);
        round.setEventId(event.getEventId());
        round.setRoundName("Quarter Final");
        round.setRoundOrder(1);
        round.setPromotionRuleTopN(1);
        round.setFinalRound(finalRound);
        round.setScoreLocked(false);

        RoundEntity nextRound = new RoundEntity();
        nextRound.setRoundId(41);
        nextRound.setEventId(event.getEventId());
        nextRound.setRoundName("Semi Final");
        nextRound.setRoundOrder(2);
        nextRound.setFinalRound(false);

        TrackEntity webTrack = track(701, event.getEventId(), "Web");
        TrackEntity aiTrack = track(702, event.getEventId(), "AI");

        SubmissionEntity alpha = submission(801, team(901, "Alpha", webTrack), round, LocalDateTime.of(2026, 6, 20, 9, 0));
        SubmissionEntity beta = submission(802, team(902, "Beta", webTrack), round, LocalDateTime.of(2026, 6, 20, 10, 0));
        SubmissionEntity gamma = submission(803, team(903, "Gamma", aiTrack), round, LocalDateTime.of(2026, 6, 20, 11, 0));

        ScoringCriteriaEntity quality = criteria(1, round, "Quality", new BigDecimal("50.00"));
        ScoringCriteriaEntity impact = criteria(2, round, "Impact", new BigDecimal("50.00"));

        UserEntity judgeOne = user("judge1@seal.test", 20);
        UserEntity judgeTwo = user("judge2@seal.test", 21);
        UserRoleEntity judgeRoleOne = role(200, judgeOne, RoleType.JUDGE);
        UserRoleEntity judgeRoleTwo = role(201, judgeTwo, RoleType.JUDGE);

        JudgeAssignmentEntity webAssignment = assignment(300, round, webTrack, judgeRoleOne);
        JudgeAssignmentEntity aiAssignment = assignment(301, round, aiTrack, judgeRoleTwo);

        List<JudgeEvaluationEntity> evaluations = List.of(
                evaluation(401, alpha, webAssignment),
                evaluation(402, beta, webAssignment),
                evaluation(403, gamma, aiAssignment)
        );

        List<ScoreEntity> scores = List.of(
                score(alpha, webAssignment, quality, new BigDecimal("90.00")),
                score(alpha, webAssignment, impact, new BigDecimal("90.00")),
                score(beta, webAssignment, quality, new BigDecimal("82.00")),
                score(beta, webAssignment, impact, new BigDecimal("82.00")),
                score(gamma, aiAssignment, quality, new BigDecimal("76.00")),
                score(gamma, aiAssignment, impact, new BigDecimal("76.00"))
        );

        return new RankingFixture(
                coordinator,
                coordinatorRole,
                event,
                round,
                nextRound,
                alpha,
                beta,
                gamma,
                List.of(quality, impact),
                List.of(webAssignment, aiAssignment),
                evaluations,
                scores
        );
    }

    private FinalizationSubmissionDto byTeamName(List<FinalizationSubmissionDto> submissions, String teamName) {
        return submissions.stream()
                .filter(item -> teamName.equals(item.teamName()))
                .findFirst()
                .orElseThrow();
    }

    private RankingEntity rankingByTeamName(List<RankingEntity> rankings, String teamName) {
        return rankings.stream()
                .filter(item -> teamName.equals(item.getTeam().getTeamName()))
                .findFirst()
                .orElseThrow();
    }

    private Authentication auth(String email) {
        return new UsernamePasswordAuthenticationToken(email, "n/a");
    }

    private UserEntity user(String email, Integer userId) {
        UserEntity user = new UserEntity();
        user.setUserId(userId);
        user.setEmail(email);
        user.setUsername(email);
        user.setFullName(email);
        user.setPasswordHash("hash");
        user.setApproved(true);
        user.setStatus("Active");
        return user;
    }

    private UserRoleEntity role(Integer roleId, UserEntity user, RoleType roleType) {
        UserRoleEntity role = new UserRoleEntity();
        role.setUserRoleId(roleId);
        role.setUser(user);
        role.setRoleType(roleType.getDbValue());
        return role;
    }

    private TrackEntity track(Integer trackId, Integer eventId, String name) {
        TrackEntity track = new TrackEntity();
        track.setTrackId(trackId);
        track.setEventId(eventId);
        track.setName(name);
        return track;
    }

    private TeamEntity team(Integer teamId, String teamName, TrackEntity track) {
        TeamEntity team = new TeamEntity();
        team.setTeamId(teamId);
        team.setTeamName(teamName);
        team.setTrack(track);
        team.setStatus("Forming");
        return team;
    }

    private SubmissionEntity submission(Integer submissionId,
                                        TeamEntity team,
                                        RoundEntity round,
                                        LocalDateTime submittedAt) {
        SubmissionEntity submission = new SubmissionEntity();
        submission.setSubmissionId(submissionId);
        submission.setTeam(team);
        submission.setRound(round);
        submission.setRepositoryUrl("https://github.com/seal/" + team.getTeamName().toLowerCase());
        submission.setStatus(SubmissionStatus.SUBMITTED.getDbValue());
        submission.setSubmittedAt(submittedAt);
        return submission;
    }

    private ScoringCriteriaEntity criteria(Integer criteriaId,
                                           RoundEntity round,
                                           String name,
                                           BigDecimal weight) {
        ScoringCriteriaEntity criteria = new ScoringCriteriaEntity();
        criteria.setCriteriaId(criteriaId);
        criteria.setRound(round);
        criteria.setCriteriaName(name);
        criteria.setCriteriaType(name);
        criteria.setWeight(weight);
        return criteria;
    }

    private JudgeAssignmentEntity assignment(Integer assignmentId,
                                             RoundEntity round,
                                             TrackEntity track,
                                             UserRoleEntity judgeRole) {
        JudgeAssignmentEntity assignment = new JudgeAssignmentEntity();
        assignment.setJudgeAssignmentId(assignmentId);
        assignment.setRound(round);
        assignment.setTrack(track);
        assignment.setJudgeRole(judgeRole);
        return assignment;
    }

    private JudgeEvaluationEntity evaluation(Integer evaluationId,
                                             SubmissionEntity submission,
                                             JudgeAssignmentEntity assignment) {
        JudgeEvaluationEntity evaluation = new JudgeEvaluationEntity();
        evaluation.setEvaluationId(evaluationId);
        evaluation.setSubmission(submission);
        evaluation.setJudgeAssignment(assignment);
        evaluation.setStatus("Finalized");
        evaluation.setFinalizedAt(LocalDateTime.of(2026, 6, 21, 10, 0));
        return evaluation;
    }

    private ScoreEntity score(SubmissionEntity submission,
                              JudgeAssignmentEntity assignment,
                              ScoringCriteriaEntity criteria,
                              BigDecimal value) {
        ScoreEntity score = new ScoreEntity();
        score.setSubmission(submission);
        score.setJudgeAssignment(assignment);
        score.setCriteria(criteria);
        score.setScoreValue(value);
        return score;
    }

    private RankingEntity ranking(RoundEntity round,
                                  TeamEntity team,
                                  Integer rankPosition,
                                  String totalScore) {
        RankingEntity ranking = new RankingEntity();
        ranking.setRound(round);
        ranking.setTeam(team);
        ranking.setRankPosition(rankPosition);
        ranking.setTotalScore(new BigDecimal(totalScore));
        ranking.setQualifiedNextRound(false);
        ranking.setQualificationStatus(RankingQualificationStatus.PENDING.getDbValue());
        ranking.setQualificationNote("Pending qualification");
        return ranking;
    }

    private record RankingFixture(
            UserEntity coordinator,
            UserRoleEntity coordinatorRole,
            HackathonEventEntity event,
            RoundEntity round,
            RoundEntity nextRound,
            SubmissionEntity alpha,
            SubmissionEntity beta,
            SubmissionEntity gamma,
            List<ScoringCriteriaEntity> criteria,
            List<JudgeAssignmentEntity> assignments,
            List<JudgeEvaluationEntity> evaluations,
            List<ScoreEntity> scores
    ) {
    }
}
