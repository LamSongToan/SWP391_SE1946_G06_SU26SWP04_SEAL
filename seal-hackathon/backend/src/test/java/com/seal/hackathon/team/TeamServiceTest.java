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
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.event.service.EventUpdateNotificationService;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import com.seal.hackathon.team.dto.CreateTeamRequest;
import com.seal.hackathon.team.dto.RegisterTeamForEventRequest;
import com.seal.hackathon.team.dto.TeamDto;
import com.seal.hackathon.team.dto.TeamInvitationDto;
import com.seal.hackathon.team.entity.IndividualRegistrationEntity;
import com.seal.hackathon.team.entity.TeamEntity;
import com.seal.hackathon.team.entity.TeamInvitationEntity;
import com.seal.hackathon.team.entity.TeamMemberEntity;
import com.seal.hackathon.team.repository.IndividualRegistrationRepository;
import com.seal.hackathon.team.repository.TeamInvitationRepository;
import com.seal.hackathon.team.repository.TeamMemberRepository;
import com.seal.hackathon.team.repository.TeamRepository;
import com.seal.hackathon.team.service.TeamService;
import com.seal.hackathon.evaluation.service.LeaderboardService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

    @Mock
    private TeamRepository teamRepository;
    @Mock
    private TeamMemberRepository memberRepository;
    @Mock
    private TeamInvitationRepository invitationRepository;
    @Mock
    private IndividualRegistrationRepository individualRegistrationRepository;
    @Mock
    private StudentProfileRepository studentProfileRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TrackRepository trackRepository;
    @Mock
    private HackathonEventRepository eventRepository;
    @Mock
    private SubmissionRepository submissionRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private EventUpdateNotificationService notificationService;
    @Mock
    private LeaderboardService leaderboardService;

    @InjectMocks
    private TeamService teamService;

    @Test
    void createTeam_shouldAddLeaderAsFirstMember() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        AtomicReference<TeamMemberEntity> savedMember = new AtomicReference<>();

        stubCurrentStudent(leader);
        when(teamRepository.save(any(TeamEntity.class))).thenAnswer(invocation -> {
            TeamEntity team = invocation.getArgument(0);
            team.setTeamId(40);
            team.prePersist();
            return team;
        });
        when(memberRepository.save(any(TeamMemberEntity.class))).thenAnswer(invocation -> {
            TeamMemberEntity member = invocation.getArgument(0);
            member.prePersist();
            savedMember.set(member);
            return member;
        });
        when(memberRepository.findByTeamTeamIdOrderByJoinedAtAsc(40))
                .thenAnswer(invocation -> List.of(savedMember.get()));

        TeamDto result = teamService.createTeam(
                authentication("leader@example.com"),
                new CreateTeamRequest("Seal Coders", true)
        );

        Assertions.assertEquals(1, result.memberCount());
        Assertions.assertEquals(10, result.leaderUserRoleId());
        Assertions.assertTrue(result.currentUserLeader());
        Assertions.assertFalse(result.membershipValid());
        Assertions.assertNull(result.eventId());
        Assertions.assertNull(result.trackId());
        Assertions.assertEquals(8, result.joinCode().length());
        Assertions.assertTrue(result.acceptAutoAssignedMembers());
        verify(memberRepository).save(any(TeamMemberEntity.class));
    }

    @Test
    void registerTeamForEvent_shouldRejectMemberConflictInSameEvent() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        StudentProfileEntity teammate = student(2, 11, "member@example.com", "Team Member");
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setLeader(leader);
        team.setTeamName("Another Team");
        HackathonEventEntity event = registrationOpenEvent(30);
        event.setTrackSelectionMode("TEAM_SELECT");

        stubCurrentStudent(leader);
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(memberRepository.countByTeamTeamId(40)).thenReturn(3L);
        when(memberRepository.findByTeamTeamIdOrderByJoinedAtAsc(40)).thenReturn(List.of(
                teamMember(team, leader),
                teamMember(team, teammate),
                teamMember(team, student(3, 12, "other@example.com", "Other Member"))
        ));
        when(memberRepository.existsMembershipInEvent(10, 30)).thenReturn(true);
        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> teamService.registerTeamForEvent(
                        authentication("leader@example.com"),
                        40,
                        new RegisterTeamForEventRequest(30, 20)
                ));

        Assertions.assertTrue(ex.getMessage().contains("already participating in another team"));
        verify(teamRepository, never()).save(any(TeamEntity.class));
    }

    @Test
    void registerTeamForEvent_shouldRejectMemberWithIndividualRegistrationInSameEvent() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        StudentProfileEntity teammate = student(2, 11, "member@example.com", "Team Member");
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setLeader(leader);
        team.setTeamName("Another Team");
        HackathonEventEntity event = registrationOpenEvent(30);
        event.setTrackSelectionMode("TEAM_SELECT");

        IndividualRegistrationEntity existingRegistration = new IndividualRegistrationEntity();
        existingRegistration.setStudent(teammate);
        existingRegistration.setEvent(event);

        stubCurrentStudent(leader);
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(memberRepository.countByTeamTeamId(40)).thenReturn(3L);
        when(memberRepository.findByTeamTeamIdOrderByJoinedAtAsc(40)).thenReturn(List.of(
                teamMember(team, leader),
                teamMember(team, teammate),
                teamMember(team, student(3, 12, "other@example.com", "Other Member"))
        ));
        when(memberRepository.existsMembershipInEvent(10, 30)).thenReturn(false);
        when(memberRepository.existsMembershipInEvent(11, 30)).thenReturn(false);
        when(individualRegistrationRepository.findByEventEventIdAndStudentUserRoleId(30, 10)).thenReturn(Optional.empty());
        when(individualRegistrationRepository.findByEventEventIdAndStudentUserRoleId(30, 11)).thenReturn(Optional.of(existingRegistration));

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> teamService.registerTeamForEvent(
                        authentication("leader@example.com"),
                        40,
                        new RegisterTeamForEventRequest(30, 20)
                ));

        Assertions.assertTrue(ex.getMessage().contains("already has an individual registration"));
        verify(teamRepository, never()).save(any(TeamEntity.class));
    }

    @Test
    void joinByCode_shouldRejectTeamWithFiveMembers() {
        StudentProfileEntity student = student(2, 11, "member@example.com", "Team Member");
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setTrack(track(20, 30, "Web Platform"));

        stubCurrentStudent(student);
        when(teamRepository.findByJoinCodeIgnoreCase("SEAL2026")).thenReturn(Optional.of(team));
        when(eventRepository.findById(30)).thenReturn(Optional.of(registrationOpenEvent(30)));
        when(memberRepository.countByTeamTeamId(40)).thenReturn(5L);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> teamService.joinByCode(authentication("member@example.com"), "seal2026"));

        Assertions.assertTrue(ex.getMessage().contains("maximum of 5"));
        verify(memberRepository, never()).save(any(TeamMemberEntity.class));
    }

    @Test
    void joinByCode_shouldRejectCompetitionTeamAfterRegistrationDeadline() {
        StudentProfileEntity student = student(2, 11, "member@example.com", "Team Member");
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setTrack(track(20, 30, "Web Platform"));

        stubCurrentStudent(student);
        when(teamRepository.findByJoinCodeIgnoreCase("SEAL2026")).thenReturn(Optional.of(team));
        when(eventRepository.findById(30)).thenReturn(Optional.of(eventAfterRegistrationDeadline(30)));

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> teamService.joinByCode(authentication("member@example.com"), "seal2026"));

        Assertions.assertTrue(ex.getMessage().contains("Team roster is locked after the registration deadline"));
        verify(memberRepository, never()).save(any(TeamMemberEntity.class));
    }

    @Test
    void disbandTeam_shouldRejectTeamWithSubmission() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        TeamEntity team = ledTeam(leader);

        stubCurrentStudent(leader);
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(eventRepository.findById(30)).thenReturn(Optional.of(registrationOpenEvent(30)));
        when(teamRepository.countSubmissionsByTeamId(40)).thenReturn(1L);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> teamService.disbandTeam(authentication("leader@example.com"), 40));

        Assertions.assertTrue(ex.getMessage().contains("cannot be disbanded after a submission"));
        verify(teamRepository, never()).delete(any(TeamEntity.class));
    }

    @Test
    void inviteMember_shouldRejectCompetitionTeamAfterRegistrationDeadline() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        TeamEntity team = ledTeam(leader);

        stubCurrentStudent(leader);
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(eventRepository.findById(30)).thenReturn(Optional.of(eventAfterRegistrationDeadline(30)));

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> teamService.inviteMember(authentication("leader@example.com"), 40, "candidate@example.com"));

        Assertions.assertTrue(ex.getMessage().contains("Team roster is locked after the registration deadline"));
        verify(invitationRepository, never()).save(any());
    }

    @Test
    void disbandTeam_shouldRemoveMembershipsBeforeDeletingUnusedTeam() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        TeamEntity team = ledTeam(leader);

        stubCurrentStudent(leader);
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(eventRepository.findById(30)).thenReturn(Optional.of(registrationOpenEvent(30)));
        when(teamRepository.countSubmissionsByTeamId(40)).thenReturn(0L);

        teamService.disbandTeam(authentication("leader@example.com"), 40);

        verify(memberRepository).deleteByTeamTeamId(40);
        verify(teamRepository).delete(team);
    }

    @Test
    void leaveTeam_shouldRejectLeader() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        TeamEntity team = ledTeam(leader);

        stubCurrentStudent(leader);
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(eventRepository.findById(30)).thenReturn(Optional.of(registrationOpenEvent(30)));
        when(memberRepository.existsByTeamTeamIdAndStudentUserRoleId(40, 10)).thenReturn(true);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> teamService.leaveTeam(authentication("leader@example.com"), 40));

        Assertions.assertTrue(ex.getMessage().contains("Transfer team leadership"));
        verify(memberRepository, never()).deleteById(any());
    }

    @Test
    void removeMember_shouldRejectCompetitionTeamAfterRegistrationDeadline() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        TeamEntity team = ledTeam(leader);

        stubCurrentStudent(leader);
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(eventRepository.findById(30)).thenReturn(Optional.of(eventAfterRegistrationDeadline(30)));

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> teamService.removeMember(authentication("leader@example.com"), 40, 11));

        Assertions.assertTrue(ex.getMessage().contains("Team roster is locked after the registration deadline"));
        verify(memberRepository, never()).deleteById(any());
    }

    @Test
    void transferLeadership_shouldCreatePendingLeadershipInvitation() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        StudentProfileEntity member = student(2, 11, "member@example.com", "Team Member");
        TeamEntity team = ledTeam(leader);

        stubCurrentStudent(leader);
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(eventRepository.findById(30)).thenReturn(Optional.of(registrationOpenEvent(30)));
        when(memberRepository.existsByTeamTeamIdAndStudentUserRoleId(40, 11)).thenReturn(true);
        when(studentProfileRepository.findById(11)).thenReturn(Optional.of(member));
        when(invitationRepository.save(any(TeamInvitationEntity.class))).thenAnswer(invocation -> {
            TeamInvitationEntity invitation = invocation.getArgument(0);
            invitation.setInvitationId(70);
            invitation.prePersist();
            return invitation;
        });

        TeamInvitationDto result = teamService.transferLeadership(authentication("leader@example.com"), 40, 11);

        Assertions.assertEquals(70, result.invitationId());
        Assertions.assertEquals("LEADERSHIP_TRANSFER", result.invitationType());
        Assertions.assertEquals("Pending", result.status());
        Assertions.assertEquals(leader.getUserRole().getUser().getFullName(), result.invitedByName());
        Assertions.assertEquals(member.getUserRole().getUser().getFullName(), result.inviteeName());
        Assertions.assertEquals(leader, team.getLeader());
        verify(invitationRepository).save(any(TeamInvitationEntity.class));
        verify(teamRepository, never()).save(team);
    }

    @Test
    void acceptInvitation_shouldTransferLeadershipOnlyAfterInviteeAccepts() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        StudentProfileEntity member = student(2, 11, "member@example.com", "Team Member");
        TeamEntity team = ledTeam(leader);

        TeamInvitationEntity invitation = new TeamInvitationEntity();
        invitation.setInvitationId(70);
        invitation.setTeam(team);
        invitation.setInvitee(member);
        invitation.setInvitedBy(leader);
        invitation.setInvitationType("LEADERSHIP_TRANSFER");
        invitation.setStatus("Pending");

        stubCurrentStudent(member);
        when(invitationRepository.findById(70)).thenReturn(Optional.of(invitation));
        when(eventRepository.findById(30)).thenReturn(Optional.of(registrationOpenEvent(30)));
        when(memberRepository.existsByTeamTeamIdAndStudentUserRoleId(40, 11)).thenReturn(true);
        when(teamRepository.save(team)).thenReturn(team);
        when(invitationRepository.findByTeamTeamIdAndStatusIgnoreCaseAndInvitationTypeIgnoreCase(40, "Pending", "LEADERSHIP_TRANSFER"))
                .thenReturn(List.of(invitation));
        when(invitationRepository.save(invitation)).thenReturn(invitation);
        when(memberRepository.findByTeamTeamIdOrderByJoinedAtAsc(40)).thenReturn(List.of(
                teamMember(team, leader),
                teamMember(team, member)
        ));

        TeamDto result = teamService.acceptInvitation(authentication("member@example.com"), 70);

        Assertions.assertEquals(member, team.getLeader());
        Assertions.assertEquals(11, result.leaderUserRoleId());
        Assertions.assertTrue(result.currentUserLeader());
        Assertions.assertEquals("Accepted", invitation.getStatus());
        verify(teamRepository).save(team);
    }

    @Test
    void registerTeamForEvent_shouldPreferTrackNeedingMoreTeamsWhenSystemAssigns() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setLeader(leader);
        team.setTeamName("Balanced Track Team");

        HackathonEventEntity event = registrationOpenEvent(30);
        event.setTrackSelectionMode("SYSTEM_ASSIGN");

        TrackEntity webTrack = track(20, 30, "Web Track");
        webTrack.setMinTeams(3);
        TrackEntity aiTrack = track(21, 30, "AI Track");
        aiTrack.setMinTeams(1);

        stubCurrentStudent(leader);
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(memberRepository.countByTeamTeamId(40)).thenReturn(3L);
        when(memberRepository.findByTeamTeamIdOrderByJoinedAtAsc(40)).thenReturn(List.of(
                teamMember(team, leader),
                teamMember(team, student(2, 11, "member1@example.com", "Member One")),
                teamMember(team, student(3, 12, "member2@example.com", "Member Two"))
        ));
        when(teamRepository.existsByEventIdAndTeamNameIgnoreCase(30, "Balanced Track Team")).thenReturn(false);
        when(teamRepository.countByTrackTrackId(20)).thenReturn(0L);
        when(teamRepository.countByTrackTrackId(21)).thenReturn(0L);
        when(trackRepository.findByEventIdOrderByTrackIdAsc(30)).thenReturn(List.of(webTrack, aiTrack));
        when(individualRegistrationRepository.findByEventEventIdAndStudentUserRoleId(30, 10)).thenReturn(Optional.empty());
        when(individualRegistrationRepository.findByEventEventIdAndStudentUserRoleId(30, 11)).thenReturn(Optional.empty());
        when(individualRegistrationRepository.findByEventEventIdAndStudentUserRoleId(30, 12)).thenReturn(Optional.empty());
        when(teamRepository.save(any(TeamEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TeamDto result = teamService.registerTeamForEvent(
                authentication("leader@example.com"),
                40,
                new RegisterTeamForEventRequest(30, null)
        );

        Assertions.assertEquals(20, result.trackId());
        Assertions.assertEquals("Web Track", result.trackName());
    }

    private void stubCurrentStudent(StudentProfileEntity student) {
        when(userRepository.findByEmailIgnoreCase(student.getUserRole().getUser().getEmail()))
                .thenReturn(Optional.of(student.getUserRole().getUser()));
        when(studentProfileRepository.findByUserRoleUserUserId(student.getUserRole().getUser().getUserId()))
                .thenReturn(Optional.of(student));
    }

    private Authentication authentication(String email) {
        return new UsernamePasswordAuthenticationToken(email, "ignored");
    }

    private StudentProfileEntity student(Integer userId, Integer userRoleId, String email, String fullName) {
        UserEntity user = new UserEntity();
        user.setUserId(userId);
        user.setEmail(email);
        user.setFullName(fullName);

        UserRoleEntity role = new UserRoleEntity();
        role.setUserRoleId(userRoleId);
        role.setUser(user);

        StudentProfileEntity student = new StudentProfileEntity();
        student.setUserRoleId(userRoleId);
        student.setUserRole(role);
        return student;
    }

    private TrackEntity track(Integer trackId, Integer eventId, String name) {
        TrackEntity track = new TrackEntity();
        track.setTrackId(trackId);
        track.setEventId(eventId);
        track.setName(name);
        return track;
    }

    private TeamEntity ledTeam(StudentProfileEntity leader) {
        TeamEntity team = new TeamEntity();
        team.setTeamId(40);
        team.setTrack(track(20, 30, "Web Platform"));
        team.setLeader(leader);
        return team;
    }

    private TeamMemberEntity teamMember(TeamEntity team, StudentProfileEntity student) {
        TeamMemberEntity member = new TeamMemberEntity();
        member.setTeam(team);
        member.setStudent(student);
        return member;
    }

    private HackathonEventEntity registrationOpenEvent(Integer eventId) {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(eventId);
        event.setName("SEAL Summer 2026");
        event.setStatus(EventStatus.ONGOING.getDbValue());
        event.setRegistrationStartAt(java.time.LocalDateTime.now().minusDays(1));
        event.setRegistrationEndAt(java.time.LocalDateTime.now().plusDays(1));
        event.setCompetitionEndAt(java.time.LocalDateTime.now().plusDays(30));
        return event;
    }

    private HackathonEventEntity eventAfterRegistrationDeadline(Integer eventId) {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(eventId);
        event.setName("SEAL Summer 2026");
        event.setStatus(EventStatus.ONGOING.getDbValue());
        event.setRegistrationStartAt(java.time.LocalDateTime.now().minusDays(10));
        event.setRegistrationEndAt(java.time.LocalDateTime.now().minusDays(1));
        event.setCompetitionEndAt(java.time.LocalDateTime.now().plusDays(30));
        return event;
    }
}
