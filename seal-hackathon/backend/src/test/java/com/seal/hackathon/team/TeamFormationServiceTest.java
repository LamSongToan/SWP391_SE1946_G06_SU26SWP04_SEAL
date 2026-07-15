package com.seal.hackathon.team;

import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserRoleEntity;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.evaluation.dto.ManualEliminationRequest;
import com.seal.hackathon.evaluation.repository.FeedbackRepository;
import com.seal.hackathon.evaluation.repository.JudgeEvaluationRepository;
import com.seal.hackathon.evaluation.repository.RankingRepository;
import com.seal.hackathon.evaluation.repository.ScoreHistoryRepository;
import com.seal.hackathon.evaluation.repository.ScoreRepository;
import com.seal.hackathon.evaluation.service.AuditLogService;
import com.seal.hackathon.evaluation.service.CoordinatorScoringService;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.EventUpdateNotificationRepository;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.JudgeAssignmentRepository;
import com.seal.hackathon.event.repository.TrackMentorRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.event.service.EventUpdateNotificationService;
import com.seal.hackathon.submission.entity.SubmissionEntity;
import com.seal.hackathon.submission.repository.SubmissionHistoryRepository;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import com.seal.hackathon.team.dto.IndividualRegistrationDto;
import com.seal.hackathon.team.dto.TeamFormationDashboardDto;
import com.seal.hackathon.team.entity.IndividualRegistrationEntity;
import com.seal.hackathon.team.entity.TeamEntity;
import com.seal.hackathon.team.entity.TeamMemberEntity;
import com.seal.hackathon.team.entity.TeamMemberId;
import com.seal.hackathon.team.repository.IndividualRegistrationRepository;
import com.seal.hackathon.team.repository.TeamMemberRepository;
import com.seal.hackathon.team.repository.TeamRepository;
import com.seal.hackathon.team.service.TeamFormationService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamFormationServiceTest {

    @Mock
    private IndividualRegistrationRepository individualRegistrationRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private TeamMemberRepository teamMemberRepository;
    @Mock
    private StudentProfileRepository studentProfileRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private HackathonEventRepository eventRepository;
    @Mock
    private EventUpdateNotificationRepository notificationRepository;
    @Mock
    private TrackRepository trackRepository;
    @Mock
    private TrackMentorRepository trackMentorRepository;
    @Mock
    private SubmissionRepository submissionRepository;
    @Mock
    private SubmissionHistoryRepository submissionHistoryRepository;
    @Mock
    private ScoreRepository scoreRepository;
    @Mock
    private ScoreHistoryRepository scoreHistoryRepository;
    @Mock
    private JudgeEvaluationRepository judgeEvaluationRepository;
    @Mock
    private FeedbackRepository feedbackRepository;
    @Mock
    private RankingRepository rankingRepository;
    @Mock
    private JudgeAssignmentRepository judgeAssignmentRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private EventUpdateNotificationService notificationService;
    @Mock
    private CoordinatorScoringService coordinatorScoringService;

    @InjectMocks
    private TeamFormationService teamFormationService;

    @Test
    void autoMatchWaitingIndividuals_shouldCreateTeamAndNotifyStudents() {
        HackathonEventEntity event = event(30);
        TrackEntity track = track(20, 30, "AI Track");
        List<IndividualRegistrationEntity> waiting = List.of(
                registration(1, event, student(1, 101, "one@example.com", "One Student")),
                registration(2, event, student(2, 102, "two@example.com", "Two Student")),
                registration(3, event, student(3, 103, "three@example.com", "Three Student"))
        );
        AtomicInteger memberCount = new AtomicInteger();

        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(individualRegistrationRepository.findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(30, "Waiting"))
                .thenReturn(waiting)
                .thenReturn(List.of());
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(track));
        when(teamRepository.countByTrackTrackId(20)).thenReturn(0L);
        when(teamRepository.save(any(TeamEntity.class))).thenAnswer(invocation -> {
            TeamEntity team = invocation.getArgument(0);
            if (team.getTeamId() == null) {
                team.setTeamId(40);
            }
            return team;
        });
        when(teamMemberRepository.save(any(TeamMemberEntity.class))).thenAnswer(invocation -> {
            memberCount.incrementAndGet();
            return invocation.getArgument(0);
        });
        when(teamMemberRepository.countByTeamTeamId(40)).thenAnswer(invocation -> (long) memberCount.get());
        when(teamRepository.findDetailedByEventId(30)).thenReturn(List.of());
        when(trackMentorRepository.findByTrackEventId(30)).thenReturn(List.of());

        TeamFormationDashboardDto dashboard = teamFormationService.autoMatchWaitingIndividuals(30);

        Assertions.assertEquals(0, dashboard.waitingIndividuals().size());
        verify(notificationService).notifyTeamMatched(waiting.get(0).getStudent().getUserRole().getUser(), event, waiting.get(0).getAssignedTeam());
        verify(notificationService).notifyTeamMatched(waiting.get(1).getStudent().getUserRole().getUser(), event, waiting.get(1).getAssignedTeam());
        verify(notificationService).notifyTeamMatched(waiting.get(2).getStudent().getUserRole().getUser(), event, waiting.get(2).getAssignedTeam());
    }

    @Test
    void registerIndividual_shouldRequireTrackWhenEventUsesTeamSelect() {
        StudentProfileEntity student = student(1, 101, "student@example.com", "Student One");
        HackathonEventEntity event = event(30);
        event.setTrackSelectionMode("TEAM_SELECT");
        TrackEntity track = track(20, 30, "AI Track");

        when(userRepository.findByEmailIgnoreCase("student@example.com")).thenReturn(Optional.of(student.getUserRole().getUser()));
        when(studentProfileRepository.findByUserRoleUserUserId(1)).thenReturn(Optional.of(student));
        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(teamMemberRepository.existsMembershipInEvent(101, 30)).thenReturn(false);
        when(individualRegistrationRepository.findByEventEventIdAndStudentUserRoleId(30, 101))
                .thenReturn(Optional.empty());
        when(individualRegistrationRepository.existsByEventEventIdAndStudentUserRoleIdAndStatusIgnoreCase(30, 101, "Waiting"))
                .thenReturn(false);
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(track));

        ApiException exception = Assertions.assertThrows(
                ApiException.class,
                () -> teamFormationService.registerIndividual(authentication("student@example.com"), 30, null)
        );

        Assertions.assertTrue(exception.getMessage().contains("Choose a track before registering individually"));
    }

    @Test
    void registerIndividual_shouldPersistPreferredTrackWhenEventUsesTeamSelect() {
        StudentProfileEntity student = student(1, 101, "student@example.com", "Student One");
        HackathonEventEntity event = event(30);
        event.setTrackSelectionMode("TEAM_SELECT");
        TrackEntity track = track(20, 30, "AI Track");
        AtomicReference<IndividualRegistrationEntity> savedRegistration = new AtomicReference<>();

        when(userRepository.findByEmailIgnoreCase("student@example.com")).thenReturn(Optional.of(student.getUserRole().getUser()));
        when(studentProfileRepository.findByUserRoleUserUserId(1)).thenReturn(Optional.of(student));
        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(teamMemberRepository.existsMembershipInEvent(101, 30)).thenReturn(false);
        when(individualRegistrationRepository.findByEventEventIdAndStudentUserRoleId(30, 101))
                .thenReturn(Optional.empty());
        when(individualRegistrationRepository.existsByEventEventIdAndStudentUserRoleIdAndStatusIgnoreCase(30, 101, "Waiting"))
                .thenReturn(false);
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(track));
        when(individualRegistrationRepository.save(any(IndividualRegistrationEntity.class))).thenAnswer(invocation -> {
            IndividualRegistrationEntity registration = invocation.getArgument(0);
            if (registration.getIndividualRegistrationId() == null) {
                registration.setIndividualRegistrationId(1);
            }
            savedRegistration.set(registration);
            return registration;
        });
        when(individualRegistrationRepository.findByEventEventIdAndStudentUserRoleId(30, 101))
                .thenAnswer(invocation -> Optional.ofNullable(savedRegistration.get()));

        IndividualRegistrationDto result = teamFormationService.registerIndividual(authentication("student@example.com"), 30, 20);

        Assertions.assertEquals(20, result.trackId());
        Assertions.assertEquals("AI Track", result.trackName());
    }

    @Test
    void registerIndividual_shouldRejectWhenStudentAlreadyRegisteredIndividuallyForEvent() {
        StudentProfileEntity student = student(1, 101, "student@example.com", "Student One");
        HackathonEventEntity event = event(30);
        event.setTrackSelectionMode("TEAM_SELECT");
        IndividualRegistrationEntity existing = registration(1, event, student);

        when(userRepository.findByEmailIgnoreCase("student@example.com")).thenReturn(Optional.of(student.getUserRole().getUser()));
        when(studentProfileRepository.findByUserRoleUserUserId(1)).thenReturn(Optional.of(student));
        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(teamMemberRepository.existsMembershipInEvent(101, 30)).thenReturn(false);
        when(individualRegistrationRepository.findByEventEventIdAndStudentUserRoleId(30, 101))
                .thenReturn(Optional.of(existing));

        ApiException exception = Assertions.assertThrows(
                ApiException.class,
                () -> teamFormationService.registerIndividual(authentication("student@example.com"), 30, null)
        );

        Assertions.assertTrue(exception.getMessage().contains("already registered individually"));
    }

    @Test
    void listMyIndividualRegistrations_shouldReturnStudentStatuses() {
        StudentProfileEntity student = student(1, 101, "student@example.com", "Student One");
        HackathonEventEntity event = event(30);
        IndividualRegistrationEntity waiting = registration(1, event, student);

        when(userRepository.findByEmailIgnoreCase("student@example.com")).thenReturn(Optional.of(student.getUserRole().getUser()));
        when(studentProfileRepository.findByUserRoleUserUserId(1)).thenReturn(Optional.of(student));
        when(individualRegistrationRepository.findByStudentUserRoleIdOrderByCreatedAtDesc(101)).thenReturn(List.of(waiting));

        List<IndividualRegistrationDto> result = teamFormationService.listMyIndividualRegistrations(authentication("student@example.com"));

        Assertions.assertEquals(1, result.size());
        Assertions.assertEquals("Waiting", result.get(0).status());
        Assertions.assertEquals("SEAL Summer 2026", result.get(0).eventName());
    }

    @Test
    void getFormationDashboard_shouldAutoAssignWaitingIndividualsAfterDeadline() {
        HackathonEventEntity event = event(30);
        event.setRegistrationEndAt(LocalDateTime.now().minusDays(1));
        TrackEntity track = track(20, 30, "AI Track");
        track.setMinTeams(2);
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setTeamName("Short Team");
        team.setLeader(student(2, 102, "leader@example.com", "Leader"));
        team.setTrack(track);
        team.setAcceptAutoAssignedMembers(true);
        IndividualRegistrationEntity waiting = registration(1, event, student(1, 101, "student@example.com", "Student One"));

        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(teamRepository.findDetailedByEventId(30)).thenReturn(List.of(team));
        when(teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(40)).thenReturn(List.of(teamMember(team, team.getLeader())));
        when(submissionRepository.countByTeamTeamId(40)).thenReturn(0L);
        when(individualRegistrationRepository.findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(30, "Waiting"))
                .thenReturn(List.of(waiting))
                .thenReturn(List.of());
        when(trackMentorRepository.findByTrackEventId(30)).thenReturn(List.of());
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(track));
        when(teamRepository.countByTrackTrackId(20)).thenReturn(1L);
        when(teamMemberRepository.countByTeamTeamId(40)).thenReturn(1L, 2L);
        when(teamMemberRepository.save(any(TeamMemberEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(teamRepository.save(any(TeamEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TeamFormationDashboardDto dashboard = teamFormationService.getFormationDashboard(30);

        Assertions.assertTrue(dashboard.registrationClosed());
        Assertions.assertTrue(dashboard.waitingIndividuals().isEmpty());
        Assertions.assertEquals("Matched", waiting.getStatus());
        Assertions.assertEquals(team, waiting.getAssignedTeam());
        Assertions.assertTrue(dashboard.actionRequired().stream().anyMatch(item -> item.type().equals("TEAM_MISSING_MEMBERS")));
        Assertions.assertTrue(dashboard.actionRequired().stream().anyMatch(item -> item.type().equals("TRACK_BELOW_MINIMUM")));
    }

    @Test
    void getFormationDashboard_shouldPrioritizeOldestRegistrationAndSmallestEligibleTeam() {
        HackathonEventEntity event = event(30);
        event.setRegistrationEndAt(LocalDateTime.now().minusDays(1));
        TrackEntity track = track(20, 30, "AI Track");
        java.util.Map<Integer, Long> teamCounts = new java.util.HashMap<>();

        TeamEntity smallerTeam = new TeamEntity();
        smallerTeam.setTeamId(40);
        smallerTeam.setTeamName("Smaller Team");
        smallerTeam.setLeader(student(2, 102, "leader1@example.com", "Leader One"));
        smallerTeam.setTrack(track);
        smallerTeam.setAcceptAutoAssignedMembers(true);

        TeamEntity largerTeam = new TeamEntity();
        largerTeam.setTeamId(41);
        largerTeam.setTeamName("Larger Team");
        largerTeam.setLeader(student(3, 103, "leader2@example.com", "Leader Two"));
        largerTeam.setTrack(track);
        largerTeam.setAcceptAutoAssignedMembers(true);
        teamCounts.put(40, 3L);
        teamCounts.put(41, 4L);

        IndividualRegistrationEntity oldest = registration(1, event, student(10, 110, "oldest@example.com", "Oldest Student"));
        oldest.setCreatedAt(LocalDateTime.now().minusHours(5));
        IndividualRegistrationEntity newest = registration(2, event, student(11, 111, "newest@example.com", "Newest Student"));
        newest.setCreatedAt(LocalDateTime.now().minusHours(1));

        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(teamRepository.findDetailedByEventId(30)).thenReturn(List.of(smallerTeam, largerTeam));
        when(individualRegistrationRepository.findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(30, "Waiting"))
                .thenReturn(List.of(oldest, newest))
                .thenReturn(List.of());
        when(teamMemberRepository.countByTeamTeamId(any(Integer.class))).thenAnswer(invocation ->
                teamCounts.getOrDefault(invocation.getArgument(0), 0L)
        );
        when(teamMemberRepository.save(any(TeamMemberEntity.class))).thenAnswer(invocation -> {
            TeamMemberEntity member = invocation.getArgument(0);
            Integer teamId = member.getTeam() == null ? null : member.getTeam().getTeamId();
            if (teamId != null) {
                teamCounts.put(teamId, teamCounts.getOrDefault(teamId, 0L) + 1L);
            }
            return member;
        });
        when(teamRepository.save(any(TeamEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(40)).thenReturn(List.of(teamMember(smallerTeam, smallerTeam.getLeader())));
        when(teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(41)).thenReturn(List.of(teamMember(largerTeam, largerTeam.getLeader())));
        when(trackMentorRepository.findByTrackEventId(30)).thenReturn(List.of());
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(track));
        when(teamRepository.countByTrackTrackId(20)).thenReturn(2L);
        when(submissionRepository.countByTeamTeamId(40)).thenReturn(0L);
        when(submissionRepository.countByTeamTeamId(41)).thenReturn(0L);

        TeamFormationDashboardDto dashboard = teamFormationService.getFormationDashboard(30);

        Assertions.assertTrue(dashboard.waitingIndividuals().isEmpty());
        Assertions.assertEquals(smallerTeam, oldest.getAssignedTeam());
        Assertions.assertTrue(newest.getAssignedTeam() == smallerTeam || newest.getAssignedTeam() == largerTeam);
        Assertions.assertEquals("Matched", oldest.getStatus());
        Assertions.assertEquals("Matched", newest.getStatus());
    }

    @Test
    void getFormationDashboard_shouldMarkUnplaceableIndividualsAsUnsuccessfulAfterDeadline() {
        HackathonEventEntity event = event(30);
        event.setRegistrationEndAt(LocalDateTime.now().minusDays(1));
        TrackEntity aiTrack = track(20, 30, "AI Track");
        TrackEntity webTrack = track(21, 30, "Web Track");
        event.setTrackSelectionMode("TEAM_SELECT");

        TeamEntity optedInWrongTrack = new TeamEntity();
        optedInWrongTrack.setTeamId(40);
        optedInWrongTrack.setTeamName("Web Team");
        optedInWrongTrack.setLeader(student(2, 102, "leader@example.com", "Leader"));
        optedInWrongTrack.setTrack(webTrack);
        optedInWrongTrack.setAcceptAutoAssignedMembers(true);

        IndividualRegistrationEntity waiting = registration(1, event, student(1, 101, "student@example.com", "Student One"), aiTrack);

        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(teamRepository.findDetailedByEventId(30)).thenReturn(List.of(optedInWrongTrack));
        when(individualRegistrationRepository.findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(30, "Waiting"))
                .thenReturn(List.of(waiting))
                .thenReturn(List.of());
        when(teamMemberRepository.countByTeamTeamId(40)).thenReturn(3L);
        when(teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(40)).thenReturn(List.of(teamMember(optedInWrongTrack, optedInWrongTrack.getLeader())));
        when(trackMentorRepository.findByTrackEventId(30)).thenReturn(List.of());
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(aiTrack, webTrack));
        when(teamRepository.countByTrackTrackId(20)).thenReturn(0L);
        when(teamRepository.countByTrackTrackId(21)).thenReturn(1L);
        when(submissionRepository.countByTeamTeamId(40)).thenReturn(0L);
        when(individualRegistrationRepository.findByEventEventIdAndStatusInOrderByCreatedAtAsc(eq(30), any()))
                .thenReturn(List.of(waiting));

        TeamFormationDashboardDto dashboard = teamFormationService.getFormationDashboard(30);

        Assertions.assertEquals(1, dashboard.waitingIndividuals().size());
        Assertions.assertEquals("CoordinatorReview", waiting.getStatus());
        verify(notificationService, never()).notifyTeamFormationUnsuccessful(any(), any(), any());
    }

    @Test
    void assignIndividualToTeam_shouldNotifyAssignedStudent() {
        HackathonEventEntity event = event(30);
        event.setRegistrationEndAt(LocalDateTime.now().plusHours(1));
        TrackEntity track = track(20, 30, "AI Track");
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setTeamName("Target Team");
        team.setLeader(student(2, 102, "leader@example.com", "Leader"));
        team.setTrack(track);
        team.setAcceptAutoAssignedMembers(true);
        IndividualRegistrationEntity waiting = registration(1, event, student(1, 101, "student@example.com", "Student One"));

        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(individualRegistrationRepository.findById(1)).thenReturn(Optional.of(waiting));
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(teamMemberRepository.countByTeamTeamId(40)).thenReturn(2L).thenReturn(3L);
        when(teamMemberRepository.existsMembershipInEvent(101, 30)).thenReturn(false);
        when(teamMemberRepository.save(any(TeamMemberEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(teamRepository.save(any(TeamEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(teamRepository.findDetailedByEventId(30)).thenReturn(List.of());
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(track));
        when(trackMentorRepository.findByTrackEventId(30)).thenReturn(List.of());
        when(notificationRepository.existsByEventIdAndAnnouncementAudienceIgnoreCase(30, "SYSTEM_EVENT_STARTED")).thenReturn(false);

        teamFormationService.assignIndividualToTeam(30, 1, 40);

        verify(notificationService).notifyTeamMatched(waiting.getStudent().getUserRole().getUser(), event, team);
        verify(notificationService).notifyCoordinatorAddedTeamMember(
                waiting.getStudent().getUserRole().getUser(),
                team,
                event,
                "Coordinator placed your individual registration into an eligible team."
        );
        Assertions.assertEquals("Matched", waiting.getStatus());
        Assertions.assertEquals(team, waiting.getAssignedTeam());
    }

    @Test
    void assignTeamTrack_shouldRequireAuthentication() {
        ApiException exception = Assertions.assertThrows(
                ApiException.class,
                () -> teamFormationService.assignTeamTrack(null, 30, 40, 20, "Track balancing")
        );

        Assertions.assertTrue(exception.getMessage().contains("Authentication is required"));
        verify(teamRepository, never()).save(any(TeamEntity.class));
    }

    @Test
    void removeTeamMember_shouldRejectLeaderRemoval() {
        UserEntity coordinator = new UserEntity();
        coordinator.setUserId(900);
        coordinator.setEmail("coordinator@example.com");

        HackathonEventEntity event = event(30);
        TrackEntity track = track(20, 30, "AI Track");
        StudentProfileEntity leader = student(2, 102, "leader@example.com", "Leader");
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setTeamName("Target Team");
        team.setLeader(leader);
        team.setTrack(track);
        team.setStatus("Ready");

        when(userRepository.findByEmailIgnoreCase("coordinator@example.com")).thenReturn(Optional.of(coordinator));
        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(teamMemberRepository.existsById(any(TeamMemberId.class))).thenReturn(true);

        ApiException exception = Assertions.assertThrows(
                ApiException.class,
                () -> teamFormationService.removeTeamMember(authentication("coordinator@example.com"), 30, 40, 102, "Violation")
        );

        Assertions.assertTrue(exception.getMessage().contains("Transfer team leadership before removing the leader"));
        verify(teamMemberRepository, never()).deleteById(any(TeamMemberId.class));
    }

    @Test
    void removeTeamMember_shouldRemoveMemberWithoutIntermediateNotificationsAndAudit() {
        UserEntity coordinator = new UserEntity();
        coordinator.setUserId(900);
        coordinator.setEmail("coordinator@example.com");
        coordinator.setUsername("coord");
        coordinator.setFullName("Coordinator");

        HackathonEventEntity event = event(30);
        TrackEntity track = track(20, 30, "AI Track");
        StudentProfileEntity leader = student(2, 102, "leader@example.com", "Leader");
        StudentProfileEntity removedMember = student(3, 103, "removed@example.com", "Removed Member");
        StudentProfileEntity remainingMember = student(4, 104, "remain@example.com", "Remaining Member");
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setTeamName("Target Team");
        team.setLeader(leader);
        team.setTrack(track);
        team.setStatus("Ready");

        when(userRepository.findByEmailIgnoreCase("coordinator@example.com")).thenReturn(Optional.of(coordinator));
        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(teamMemberRepository.existsById(any(TeamMemberId.class))).thenReturn(true);
        when(studentProfileRepository.findById(103)).thenReturn(Optional.of(removedMember));
        when(teamMemberRepository.countByTeamTeamId(40)).thenReturn(3L, 2L, 2L, 2L);
        when(teamRepository.save(any(TeamEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(teamRepository.findDetailedByEventId(30)).thenReturn(List.of(team));
        when(teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(40)).thenReturn(List.of(
                teamMember(team, leader),
                teamMember(team, remainingMember)
        ));
        when(submissionRepository.countByTeamTeamId(40)).thenReturn(0L);
        when(trackMentorRepository.findByTrackEventId(30)).thenReturn(List.of());
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(track));
        when(teamRepository.countByTrackTrackId(20)).thenReturn(1L);
        when(notificationRepository.existsByEventIdAndAnnouncementAudienceIgnoreCase(30, "SYSTEM_EVENT_STARTED")).thenReturn(false);

        TeamFormationDashboardDto dashboard = teamFormationService.removeTeamMember(
                authentication("coordinator@example.com"),
                30,
                40,
                103,
                "Code of conduct violation"
        );

        Assertions.assertEquals(1, dashboard.teams().size());
        Assertions.assertFalse(dashboard.teams().get(0).membershipValid());
        verify(teamMemberRepository).deleteById(any(TeamMemberId.class));
        verify(notificationService, never()).notifyCoordinatorRemovedTeamMember(
                coordinator,
                removedMember.getUserRole().getUser(),
                team,
                event,
                "Code of conduct violation"
        );
        verify(notificationService, never()).notifyTeamIneligible(eq(team), eq(event), any(String.class));
        verify(auditLogService).record(
                eq(coordinator),
                eq("COORDINATOR_REMOVED_TEAM_MEMBER"),
                eq("TEAM"),
                eq(40),
                eq("Target Team"),
                any(),
                any(),
                eq("Code of conduct violation")
        );
    }

    @Test
    void confirmEventStart_shouldNotifyOnlyFinalResult() {
        UserEntity coordinator = new UserEntity();
        coordinator.setUserId(900);
        coordinator.setEmail("coordinator@example.com");
        coordinator.setUsername("coord");
        coordinator.setFullName("Coordinator");

        HackathonEventEntity event = event(30);
        event.setStatus(EventStatus.ONGOING.getDbValue());
        event.setRegistrationEndAt(LocalDateTime.now().minusDays(1));
        TrackEntity track = track(20, 30, "AI Track");

        when(userRepository.findByEmailIgnoreCase("coordinator@example.com")).thenReturn(Optional.of(coordinator));
        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(teamRepository.findDetailedByEventId(30)).thenReturn(List.of());
        when(trackMentorRepository.findByTrackEventId(30)).thenReturn(List.of());
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(track));
        when(teamRepository.countByTrackTrackId(20)).thenReturn(1L);
        when(notificationRepository.existsByEventIdAndAnnouncementAudienceIgnoreCase(30, "SYSTEM_EVENT_STARTED"))
                .thenReturn(false)
                .thenReturn(true);

        TeamFormationDashboardDto dashboard = teamFormationService.confirmEventStart(authentication("coordinator@example.com"), 30);

        Assertions.assertTrue(dashboard.eventStartConfirmed());
        verify(notificationService).notifyEventStarted(event);
        verify(auditLogService).record(
                eq(coordinator),
                eq("EVENT_START_CONFIRMED"),
                eq("EVENT"),
                eq(30),
                eq(event.getName()),
                any(),
                any(),
                eq("Coordinator confirmed the final team and track setup and started the event from team management")
        );
    }

    @Test
    void autoMatchWaitingIndividuals_shouldPreferTrackNeedingMoreTeams() {
        HackathonEventEntity event = event(30);
        TrackEntity webTrack = track(20, 30, "Web Track");
        webTrack.setMinTeams(3);
        TrackEntity aiTrack = track(21, 30, "AI Track");
        aiTrack.setMinTeams(1);
        List<IndividualRegistrationEntity> waiting = List.of(
                registration(1, event, student(1, 101, "one@example.com", "One Student")),
                registration(2, event, student(2, 102, "two@example.com", "Two Student")),
                registration(3, event, student(3, 103, "three@example.com", "Three Student"))
        );
        AtomicInteger memberCount = new AtomicInteger();

        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(individualRegistrationRepository.findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(30, "Waiting"))
                .thenReturn(waiting)
                .thenReturn(List.of());
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(webTrack, aiTrack));
        when(teamRepository.countByTrackTrackId(20)).thenReturn(0L);
        when(teamRepository.countByTrackTrackId(21)).thenReturn(0L);
        when(teamRepository.save(any(TeamEntity.class))).thenAnswer(invocation -> {
            TeamEntity team = invocation.getArgument(0);
            if (team.getTeamId() == null) {
                team.setTeamId(40);
            }
            return team;
        });
        when(teamMemberRepository.save(any(TeamMemberEntity.class))).thenAnswer(invocation -> {
            memberCount.incrementAndGet();
            return invocation.getArgument(0);
        });
        when(teamMemberRepository.countByTeamTeamId(40)).thenAnswer(invocation -> (long) memberCount.get());
        when(teamRepository.findDetailedByEventId(30)).thenReturn(List.of());
        when(trackMentorRepository.findByTrackEventId(30)).thenReturn(List.of());

        teamFormationService.autoMatchWaitingIndividuals(30);

        Assertions.assertEquals(webTrack, waiting.get(0).getAssignedTeam().getTrack());
    }

    @Test
    void autoMatchWaitingIndividuals_shouldKeepTeamSelectStudentsInsideChosenTrack() {
        HackathonEventEntity event = event(30);
        event.setTrackSelectionMode("TEAM_SELECT");
        TrackEntity aiTrack = track(20, 30, "AI Track");
        TrackEntity webTrack = track(21, 30, "Web Track");
        List<IndividualRegistrationEntity> waiting = List.of(
                registration(1, event, student(1, 101, "one@example.com", "One Student"), aiTrack),
                registration(2, event, student(2, 102, "two@example.com", "Two Student"), aiTrack),
                registration(3, event, student(3, 103, "three@example.com", "Three Student"), aiTrack),
                registration(4, event, student(4, 104, "four@example.com", "Four Student"), webTrack),
                registration(5, event, student(5, 105, "five@example.com", "Five Student"), webTrack)
        );
        AtomicInteger memberCount = new AtomicInteger();

        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(individualRegistrationRepository.findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(30, "Waiting"))
                .thenReturn(waiting)
                .thenReturn(List.of(waiting.get(3), waiting.get(4)));
        when(individualRegistrationRepository.findByEventEventIdAndStatusInOrderByCreatedAtAsc(eq(30), any()))
                .thenReturn(List.of(waiting.get(3), waiting.get(4)));
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(aiTrack, webTrack));
        when(teamRepository.save(any(TeamEntity.class))).thenAnswer(invocation -> {
            TeamEntity team = invocation.getArgument(0);
            if (team.getTeamId() == null) {
                team.setTeamId(40);
            }
            return team;
        });
        when(teamMemberRepository.save(any(TeamMemberEntity.class))).thenAnswer(invocation -> {
            memberCount.incrementAndGet();
            return invocation.getArgument(0);
        });
        when(teamMemberRepository.countByTeamTeamId(40)).thenAnswer(invocation -> (long) memberCount.get());
        when(teamRepository.findDetailedByEventId(30)).thenReturn(List.of());
        when(trackMentorRepository.findByTrackEventId(30)).thenReturn(List.of());
        when(teamRepository.countByTrackTrackId(20)).thenReturn(0L);

        TeamFormationDashboardDto dashboard = teamFormationService.autoMatchWaitingIndividuals(30);

        Assertions.assertEquals(2, dashboard.waitingIndividuals().size());
        Assertions.assertTrue(dashboard.waitingIndividuals().stream().allMatch(item -> item.trackId().equals(21)));
        Assertions.assertEquals(aiTrack, waiting.get(0).getAssignedTeam().getTrack());
    }

    @Test
    void disqualifyTeamSubmission_shouldDelegateToCoordinatorScoringRules() {
        HackathonEventEntity event = event(30);
        TrackEntity track = track(20, 30, "AI Track");
        StudentProfileEntity leader = student(2, 102, "leader@example.com", "Leader");
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setTeamName("Target Team");
        team.setLeader(leader);
        team.setTrack(track);
        team.setStatus("Ready");

        RoundEntity round = new RoundEntity();
        round.setRoundId(50);
        round.setRoundOrder(2);
        round.setRoundName("Final");
        round.setSubmissionDeadline(LocalDateTime.now().plusDays(1));

        SubmissionEntity latestSubmission = new SubmissionEntity();
        latestSubmission.setSubmissionId(60);
        latestSubmission.setTeam(team);
        latestSubmission.setRound(round);
        latestSubmission.setStatus("Submitted");
        latestSubmission.setSubmittedAt(LocalDateTime.now());

        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(submissionRepository.findByTeamTeamIdOrderByRoundRoundOrderAscSubmittedAtDesc(40)).thenReturn(List.of(latestSubmission));
        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(teamRepository.findDetailedByEventId(30)).thenReturn(List.of(team));
        when(teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(40)).thenReturn(List.of(teamMember(team, leader)));
        when(submissionRepository.countByTeamTeamId(40)).thenReturn(1L, 1L);
        when(trackMentorRepository.findByTrackEventId(30)).thenReturn(List.of());
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(track));
        when(teamRepository.countByTrackTrackId(20)).thenReturn(1L);
        UserEntity coordinator = new UserEntity();
        coordinator.setUserId(99);
        coordinator.setEmail("coordinator@example.com");
        coordinator.setUsername("coordinator@example.com");
        coordinator.setFullName("Coordinator");
        when(userRepository.findByEmailIgnoreCase("coordinator@example.com"))
                .thenReturn(Optional.of(coordinator));

        TeamFormationDashboardDto dashboard = teamFormationService.disqualifyTeamSubmission(
                authentication("coordinator@example.com"),
                30,
                40,
                new ManualEliminationRequest("Cheating")
        );

        Assertions.assertEquals(1, dashboard.teams().size());
        verify(coordinatorScoringService, never()).manuallyDisqualifySubmission(
                any(Authentication.class),
                eq(50),
                eq(60),
                any(ManualEliminationRequest.class)
        );
    }

    private Authentication authentication(String email) {
        return new UsernamePasswordAuthenticationToken(email, "ignored");
    }

    private HackathonEventEntity event(Integer eventId) {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(eventId);
        event.setName("SEAL Summer 2026");
        event.setStatus(EventStatus.ONGOING.getDbValue());
        event.setRegistrationStartAt(LocalDateTime.now().minusDays(1));
        event.setRegistrationEndAt(LocalDateTime.now().plusDays(1));
        event.setMinTeamSize(3);
        event.setMaxTeamSize(5);
        event.setTrackSelectionMode("SYSTEM_ASSIGN");
        return event;
    }

    private TrackEntity track(Integer trackId, Integer eventId, String name) {
        TrackEntity track = new TrackEntity();
        track.setTrackId(trackId);
        track.setEventId(eventId);
        track.setName(name);
        return track;
    }

    private IndividualRegistrationEntity registration(Integer id, HackathonEventEntity event, StudentProfileEntity student) {
        return registration(id, event, student, null);
    }

    private IndividualRegistrationEntity registration(Integer id,
                                                      HackathonEventEntity event,
                                                      StudentProfileEntity student,
                                                      TrackEntity preferredTrack) {
        IndividualRegistrationEntity registration = new IndividualRegistrationEntity();
        registration.setIndividualRegistrationId(id);
        registration.setEvent(event);
        registration.setStudent(student);
        registration.setPreferredTrack(preferredTrack);
        registration.setStatus("Waiting");
        registration.setCreatedAt(LocalDateTime.now().minusHours(1));
        return registration;
    }

    private StudentProfileEntity student(Integer userId, Integer userRoleId, String email, String fullName) {
        UserEntity user = new UserEntity();
        user.setUserId(userId);
        user.setEmail(email);
        user.setUsername(email);
        user.setFullName(fullName);

        UserRoleEntity role = new UserRoleEntity();
        role.setUserRoleId(userRoleId);
        role.setUser(user);

        StudentProfileEntity student = new StudentProfileEntity();
        student.setUserRoleId(userRoleId);
        student.setUserRole(role);
        return student;
    }

    private TeamMemberEntity teamMember(TeamEntity team, StudentProfileEntity student) {
        TeamMemberEntity member = new TeamMemberEntity();
        member.setTeam(team);
        member.setStudent(student);
        return member;
    }
}
