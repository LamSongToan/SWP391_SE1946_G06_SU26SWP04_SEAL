package com.seal.hackathon.evaluation;

import com.seal.hackathon.auth.entity.RoleType;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserRoleEntity;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.auth.repository.UserRoleRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.evaluation.dto.CriterionScoreRequest;
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
import com.seal.hackathon.evaluation.repository.ScoreHistoryRepository;
import com.seal.hackathon.evaluation.repository.ScoreRepository;
import com.seal.hackathon.evaluation.repository.ScoringCriteriaRepository;
import com.seal.hackathon.evaluation.service.AuditLogService;
import com.seal.hackathon.evaluation.service.EvaluationService;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.submission.entity.SubmissionEntity;
import com.seal.hackathon.submission.entity.SubmissionStatus;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import com.seal.hackathon.team.entity.TeamEntity;
import com.seal.hackathon.team.repository.TeamMemberRepository;
import com.seal.hackathon.team.repository.TeamRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EvaluationServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserRoleRepository userRoleRepository;
    @Mock
    private HackathonEventRepository eventRepository;
    @Mock
    private SubmissionRepository submissionRepository;
    @Mock
    private ScoringCriteriaRepository criteriaRepository;
    @Mock
    private JudgeAssignmentRepository judgeAssignmentRepository;
    @Mock
    private ScoreRepository scoreRepository;
    @Mock
    private JudgeEvaluationRepository evaluationRepository;
    @Mock
    private ScoreHistoryRepository scoreHistoryRepository;
    @Mock
    private FeedbackRepository feedbackRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private TeamMemberRepository teamMemberRepository;
    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private EvaluationService evaluationService;

    @Test
    void submitScores_shouldRejectWhenRoundScoreLocked() {
        UserEntity judge = user("judge@seal.test", 1);
        UserRoleEntity judgeRole = role(11, judge, RoleType.JUDGE);
        SubmissionEntity submission = submission(true);
        JudgeAssignmentEntity assignment = assignment(55, submission, judgeRole);

        when(userRepository.findByEmailIgnoreCase("judge@seal.test")).thenReturn(Optional.of(judge));
        when(userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(1, RoleType.JUDGE.getDbValue()))
                .thenReturn(Optional.of(judgeRole));
        when(submissionRepository.findDetailedById(99)).thenReturn(Optional.of(submission));
        when(judgeAssignmentRepository.findByRoundRoundIdAndTrackTrackIdAndJudgeRoleUserRoleId(40, 20, 11))
                .thenReturn(Optional.of(assignment));
        when(evaluationRepository.findBySubmissionSubmissionIdAndJudgeAssignmentJudgeAssignmentId(99, 55))
                .thenReturn(Optional.empty());

        ApiException ex = Assertions.assertThrows(ApiException.class, () -> evaluationService.submitScores(
                auth("judge@seal.test"),
                99,
                new ScoreSubmissionRequest(
                        List.of(new CriterionScoreRequest(1, BigDecimal.valueOf(8), "Good")),
                        null,
                        false
                )
        ));

        Assertions.assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    void submitScores_shouldRejectDuplicateCriteriaPerJudge() {
        UserEntity judge = user("judge@seal.test", 1);
        UserRoleEntity judgeRole = role(11, judge, RoleType.JUDGE);
        SubmissionEntity submission = submission(false);
        JudgeAssignmentEntity assignment = assignment(55, submission, judgeRole);
        HackathonEventEntity event = event(EventStatus.ONGOING);
        ScoringCriteriaEntity criteria = criteria(1, submission.getRound(), "Impact");

        when(userRepository.findByEmailIgnoreCase("judge@seal.test")).thenReturn(Optional.of(judge));
        when(userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(1, RoleType.JUDGE.getDbValue()))
                .thenReturn(Optional.of(judgeRole));
        when(submissionRepository.findDetailedById(99)).thenReturn(Optional.of(submission));
        when(judgeAssignmentRepository.findByRoundRoundIdAndTrackTrackIdAndJudgeRoleUserRoleId(40, 20, 11))
                .thenReturn(Optional.of(assignment));
        when(evaluationRepository.findBySubmissionSubmissionIdAndJudgeAssignmentJudgeAssignmentId(99, 55))
                .thenReturn(Optional.empty());
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(criteriaRepository.findByRoundRoundIdOrderByCriteriaIdAsc(40)).thenReturn(List.of(criteria));

        ApiException ex = Assertions.assertThrows(ApiException.class, () -> evaluationService.submitScores(
                auth("judge@seal.test"),
                99,
                new ScoreSubmissionRequest(
                        List.of(
                                new CriterionScoreRequest(1, BigDecimal.valueOf(8), "Good"),
                                new CriterionScoreRequest(1, BigDecimal.valueOf(9), "Duplicate")
                        ),
                        null,
                        false
                )
        ));

        Assertions.assertTrue(ex.getMessage().contains("duplicate or invalid criteria"));
    }

    @Test
    void submitScores_shouldRejectInvalidCriteriaForSubmissionRound() {
        UserEntity judge = user("judge@seal.test", 1);
        UserRoleEntity judgeRole = role(11, judge, RoleType.JUDGE);
        SubmissionEntity submission = submission(false);
        JudgeAssignmentEntity assignment = assignment(55, submission, judgeRole);
        ScoringCriteriaEntity criteria = criteria(1, submission.getRound(), "Impact");

        when(userRepository.findByEmailIgnoreCase("judge@seal.test")).thenReturn(Optional.of(judge));
        when(userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(1, RoleType.JUDGE.getDbValue()))
                .thenReturn(Optional.of(judgeRole));
        when(submissionRepository.findDetailedById(99)).thenReturn(Optional.of(submission));
        when(judgeAssignmentRepository.findByRoundRoundIdAndTrackTrackIdAndJudgeRoleUserRoleId(40, 20, 11))
                .thenReturn(Optional.of(assignment));
        when(evaluationRepository.findBySubmissionSubmissionIdAndJudgeAssignmentJudgeAssignmentId(99, 55))
                .thenReturn(Optional.empty());
        when(eventRepository.findById(10)).thenReturn(Optional.of(event(EventStatus.ONGOING)));
        when(criteriaRepository.findByRoundRoundIdOrderByCriteriaIdAsc(40)).thenReturn(List.of(criteria));

        ApiException ex = Assertions.assertThrows(ApiException.class, () -> evaluationService.submitScores(
                auth("judge@seal.test"),
                99,
                new ScoreSubmissionRequest(
                        List.of(new CriterionScoreRequest(999, BigDecimal.valueOf(8), "Unknown criterion")),
                        null,
                        false
                )
        ));

        Assertions.assertTrue(ex.getMessage().contains("duplicate or invalid criteria"));
    }

    @Test
    void submitScores_shouldRejectJudgeWithoutAssignment() {
        UserEntity judge = user("judge@seal.test", 1);
        UserRoleEntity judgeRole = role(11, judge, RoleType.JUDGE);
        SubmissionEntity submission = submission(false);

        when(userRepository.findByEmailIgnoreCase("judge@seal.test")).thenReturn(Optional.of(judge));
        when(userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(1, RoleType.JUDGE.getDbValue()))
                .thenReturn(Optional.of(judgeRole));
        when(submissionRepository.findDetailedById(99)).thenReturn(Optional.of(submission));
        when(judgeAssignmentRepository.findByRoundRoundIdAndTrackTrackIdAndJudgeRoleUserRoleId(40, 20, 11))
                .thenReturn(Optional.empty());

        ApiException ex = Assertions.assertThrows(ApiException.class, () -> evaluationService.submitScores(
                auth("judge@seal.test"),
                99,
                new ScoreSubmissionRequest(
                        List.of(new CriterionScoreRequest(1, BigDecimal.valueOf(8), "Good")),
                        null,
                        false
                )
        ));

        Assertions.assertTrue(ex.getMessage().contains("not assigned"));
    }

    @Test
    void submitScores_shouldRejectFinalizedEvaluationUntilCoordinatorReopens() {
        UserEntity judge = user("judge@seal.test", 1);
        UserRoleEntity judgeRole = role(11, judge, RoleType.JUDGE);
        SubmissionEntity submission = submission(false);
        JudgeAssignmentEntity assignment = assignment(55, submission, judgeRole);
        JudgeEvaluationEntity evaluation = finalizedEvaluation(77, submission, assignment);

        when(userRepository.findByEmailIgnoreCase("judge@seal.test")).thenReturn(Optional.of(judge));
        when(userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(1, RoleType.JUDGE.getDbValue()))
                .thenReturn(Optional.of(judgeRole));
        when(submissionRepository.findDetailedById(99)).thenReturn(Optional.of(submission));
        when(judgeAssignmentRepository.findByRoundRoundIdAndTrackTrackIdAndJudgeRoleUserRoleId(40, 20, 11))
                .thenReturn(Optional.of(assignment));
        when(evaluationRepository.findBySubmissionSubmissionIdAndJudgeAssignmentJudgeAssignmentId(99, 55))
                .thenReturn(Optional.of(evaluation));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event(EventStatus.ONGOING)));

        ApiException ex = Assertions.assertThrows(ApiException.class, () -> evaluationService.submitScores(
                auth("judge@seal.test"),
                99,
                new ScoreSubmissionRequest(
                        List.of(new CriterionScoreRequest(1, BigDecimal.valueOf(9), "Updated")),
                        null,
                        false
                )
        ));

        Assertions.assertTrue(ex.getMessage().contains("Finalized scores cannot be changed"));
    }

    @Test
    void reopenEvaluation_shouldMoveFinalizedEvaluationToDraftAndWriteHistory() {
        UserEntity coordinator = user("coordinator@seal.test", 2);
        UserRoleEntity coordinatorRole = role(12, coordinator, RoleType.COORDINATOR);
        UserEntity judge = user("judge@seal.test", 1);
        UserRoleEntity judgeRole = role(11, judge, RoleType.JUDGE);
        SubmissionEntity submission = submission(false);
        JudgeAssignmentEntity assignment = assignment(55, submission, judgeRole);
        JudgeEvaluationEntity evaluation = new JudgeEvaluationEntity();
        evaluation.setEvaluationId(77);
        evaluation.setSubmission(submission);
        evaluation.setJudgeAssignment(assignment);
        evaluation.setStatus("Finalized");
        evaluation.setFinalizedAt(LocalDateTime.of(2026, 6, 9, 10, 0));
        ScoringCriteriaEntity criteria = criteria(1, submission.getRound(), "Impact");
        ScoreEntity score = new ScoreEntity();
        score.setSubmission(submission);
        score.setJudgeAssignment(assignment);
        score.setCriteria(criteria);
        score.setScoreValue(BigDecimal.valueOf(8.50));
        score.setComment("Solid demo");

        when(userRepository.findByEmailIgnoreCase("coordinator@seal.test")).thenReturn(Optional.of(coordinator));
        when(userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(2, RoleType.COORDINATOR.getDbValue()))
                .thenReturn(Optional.of(coordinatorRole));
        when(evaluationRepository.findById(77)).thenReturn(Optional.of(evaluation));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event(EventStatus.ONGOING)));
        when(evaluationRepository.save(evaluation)).thenReturn(evaluation);
        when(scoreRepository.findBySubmissionSubmissionIdAndJudgeAssignmentJudgeAssignmentIdOrderByCriteriaCriteriaIdAsc(99, 55))
                .thenReturn(List.of(score));
        when(scoreHistoryRepository.save(any(ScoreHistoryEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        evaluationService.reopenEvaluation(auth("coordinator@seal.test"), 77);

        Assertions.assertEquals("Draft", evaluation.getStatus());
        Assertions.assertNull(evaluation.getFinalizedAt());
        ArgumentCaptor<ScoreHistoryEntity> historyCaptor = ArgumentCaptor.forClass(ScoreHistoryEntity.class);
        verify(scoreHistoryRepository).save(historyCaptor.capture());
        ScoreHistoryEntity history = historyCaptor.getValue();
        Assertions.assertEquals("REOPEN", history.getActionType());
        Assertions.assertEquals(BigDecimal.valueOf(8.50), history.getOldScoreValue());
        Assertions.assertEquals(BigDecimal.valueOf(8.50), history.getNewScoreValue());
        Assertions.assertEquals(criteria, history.getCriteria());
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

    private SubmissionEntity submission(boolean scoreLocked) {
        TrackEntity track = new TrackEntity();
        track.setTrackId(20);
        track.setEventId(10);
        track.setName("Web");

        TeamEntity team = new TeamEntity();
        team.setTeamId(30);
        team.setTeamName("Seal Team");
        team.setTrack(track);
        team.setStatus("Forming");

        RoundEntity round = new RoundEntity();
        round.setRoundId(40);
        round.setEventId(10);
        round.setRoundName("Final");
        round.setRoundOrder(2);
        round.setSubmissionDeadline(LocalDateTime.of(2026, 6, 10, 23, 59));
        round.setPromotionRuleTopN(1);
        round.setScoreLocked(scoreLocked);

        SubmissionEntity submission = new SubmissionEntity();
        submission.setSubmissionId(99);
        submission.setTeam(team);
        submission.setRound(round);
        submission.setRepositoryUrl("https://github.com/seal/team");
        submission.setStatus(SubmissionStatus.SUBMITTED.getDbValue());
        submission.setSubmittedAt(LocalDateTime.of(2026, 6, 9, 9, 0));
        return submission;
    }

    private JudgeAssignmentEntity assignment(Integer assignmentId,
                                             SubmissionEntity submission,
                                             UserRoleEntity judgeRole) {
        JudgeAssignmentEntity assignment = new JudgeAssignmentEntity();
        assignment.setJudgeAssignmentId(assignmentId);
        assignment.setRound(submission.getRound());
        assignment.setTrack(submission.getTeam().getTrack());
        assignment.setJudgeRole(judgeRole);
        return assignment;
    }

    private JudgeEvaluationEntity finalizedEvaluation(Integer evaluationId,
                                                      SubmissionEntity submission,
                                                      JudgeAssignmentEntity assignment) {
        JudgeEvaluationEntity evaluation = new JudgeEvaluationEntity();
        evaluation.setEvaluationId(evaluationId);
        evaluation.setSubmission(submission);
        evaluation.setJudgeAssignment(assignment);
        evaluation.setStatus("Finalized");
        evaluation.setFinalizedAt(LocalDateTime.of(2026, 6, 9, 10, 0));
        return evaluation;
    }

    private HackathonEventEntity event(EventStatus status) {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(10);
        event.setName("SEAL Summer 2026");
        event.setSemester("Summer");
        event.setYear(2026);
        event.setStatus(status.getDbValue());
        return event;
    }

    private ScoringCriteriaEntity criteria(Integer criteriaId, RoundEntity round, String name) {
        ScoringCriteriaEntity criteria = new ScoringCriteriaEntity();
        criteria.setCriteriaId(criteriaId);
        criteria.setRound(round);
        criteria.setCriteriaName(name);
        criteria.setCriteriaType("Product");
        criteria.setWeight(BigDecimal.valueOf(100));
        return criteria;
    }
}
