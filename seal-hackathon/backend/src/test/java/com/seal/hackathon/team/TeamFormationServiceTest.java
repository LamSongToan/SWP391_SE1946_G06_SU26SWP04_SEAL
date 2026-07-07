package com.seal.hackathon.team;

import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserRoleEntity;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.evaluation.service.AuditLogService;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.TrackMentorRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.event.service.EventUpdateNotificationService;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import com.seal.hackathon.team.dto.IndividualRegistrationDto;
import com.seal.hackathon.team.dto.TeamFormationDashboardDto;
import com.seal.hackathon.team.entity.IndividualRegistrationEntity;
import com.seal.hackathon.team.entity.TeamEntity;
import com.seal.hackathon.team.entity.TeamMemberEntity;
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

import static org.mockito.ArgumentMatchers.any;
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
    private TrackRepository trackRepository;
    @Mock
    private TrackMentorRepository trackMentorRepository;
    @Mock
    private SubmissionRepository submissionRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private EventUpdateNotificationService notificationService;

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
    void getFormationDashboard_shouldExposeActionRequiredAfterDeadline() {
        HackathonEventEntity event = event(30);
        event.setRegistrationEndAt(LocalDateTime.now().minusDays(1));
        TrackEntity track = track(20, 30, "AI Track");
        track.setMinTeams(2);
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setTeamName("Short Team");
        team.setLeader(student(2, 102, "leader@example.com", "Leader"));
        team.setTrack(track);
        IndividualRegistrationEntity waiting = registration(1, event, student(1, 101, "student@example.com", "Student One"));

        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(teamRepository.findDetailedByEventId(30)).thenReturn(List.of(team));
        when(teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(40)).thenReturn(List.of(teamMember(team, team.getLeader())));
        when(submissionRepository.countByTeamTeamId(40)).thenReturn(0L);
        when(individualRegistrationRepository.findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(30, "Waiting"))
                .thenReturn(List.of(waiting));
        when(trackMentorRepository.findByTrackEventId(30)).thenReturn(List.of());
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(track));
        when(teamRepository.countByTrackTrackId(20)).thenReturn(1L);

        TeamFormationDashboardDto dashboard = teamFormationService.getFormationDashboard(30);

        Assertions.assertTrue(dashboard.registrationClosed());
        Assertions.assertTrue(dashboard.actionRequired().stream().anyMatch(item -> item.type().equals("WAITING_INDIVIDUALS")));
        Assertions.assertTrue(dashboard.actionRequired().stream().anyMatch(item -> item.type().equals("TEAM_MISSING_MEMBERS")));
        Assertions.assertTrue(dashboard.actionRequired().stream().anyMatch(item -> item.type().equals("TRACK_BELOW_MINIMUM")));
    }

    @Test
    void assignIndividualToTeam_shouldNotifyAssignedStudent() {
        HackathonEventEntity event = event(30);
        TrackEntity track = track(20, 30, "AI Track");
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setTeamName("Target Team");
        team.setLeader(student(2, 102, "leader@example.com", "Leader"));
        team.setTrack(track);
        IndividualRegistrationEntity waiting = registration(1, event, student(1, 101, "student@example.com", "Student One"));

        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(individualRegistrationRepository.findById(1)).thenReturn(Optional.of(waiting));
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(teamMemberRepository.countByTeamTeamId(40)).thenReturn(2L).thenReturn(3L);
        when(teamMemberRepository.existsMembershipInEvent(101, 30)).thenReturn(false);
        when(teamMemberRepository.save(any(TeamMemberEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(teamRepository.save(any(TeamEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(teamRepository.findDetailedByEventId(30)).thenReturn(List.of());
        when(individualRegistrationRepository.findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(30, "Waiting"))
                .thenReturn(List.of());
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(track));
        when(trackMentorRepository.findByTrackEventId(30)).thenReturn(List.of());

        teamFormationService.assignIndividualToTeam(30, 1, 40);

        verify(notificationService).notifyTeamMatched(waiting.getStudent().getUserRole().getUser(), event, team);
        Assertions.assertEquals("Matched", waiting.getStatus());
        Assertions.assertEquals(team, waiting.getAssignedTeam());
    }

    @Test
    void assignTeamTrack_shouldRejectManualCoordinatorTrackChanges() {
        ApiException exception = Assertions.assertThrows(
                ApiException.class,
                () -> teamFormationService.assignTeamTrack(30, 40, 20)
        );

        Assertions.assertTrue(exception.getMessage().contains("Track assignment is handled during event registration"));
        verify(teamRepository, never()).save(any(TeamEntity.class));
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
        IndividualRegistrationEntity registration = new IndividualRegistrationEntity();
        registration.setIndividualRegistrationId(id);
        registration.setEvent(event);
        registration.setStudent(student);
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
