package com.seal.hackathon.team;

import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserRoleEntity;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import com.seal.hackathon.team.dto.CreateTeamRequest;
import com.seal.hackathon.team.dto.TeamDto;
import com.seal.hackathon.team.entity.TeamEntity;
import com.seal.hackathon.team.entity.TeamMemberEntity;
import com.seal.hackathon.team.repository.TeamInvitationRepository;
import com.seal.hackathon.team.repository.TeamMemberRepository;
import com.seal.hackathon.team.repository.TeamRepository;
import com.seal.hackathon.team.service.TeamService;
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
    private StudentProfileRepository studentProfileRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TrackRepository trackRepository;
    @Mock
    private HackathonEventRepository eventRepository;
    @Mock
    private SubmissionRepository submissionRepository;

    @InjectMocks
    private TeamService teamService;

    @Test
    void createTeam_shouldAddLeaderAsFirstMember() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        TrackEntity track = track(20, 30, "Web Platform");
        HackathonEventEntity event = registrationOpenEvent(30);
        AtomicReference<TeamMemberEntity> savedMember = new AtomicReference<>();

        stubCurrentStudent(leader);
        when(trackRepository.findById(20)).thenReturn(Optional.of(track));
        when(eventRepository.findById(30)).thenReturn(Optional.of(event));
        when(memberRepository.existsMembershipInEvent(10, 30)).thenReturn(false);
        when(teamRepository.existsByEventIdAndTeamNameIgnoreCase(30, "Seal Coders")).thenReturn(false);
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
        when(submissionRepository.findTopByTeamTeamIdOrderBySubmittedAtDesc(40)).thenReturn(Optional.empty());

        TeamDto result = teamService.createTeam(authentication("leader@example.com"), new CreateTeamRequest(20, "Seal Coders"));

        Assertions.assertEquals(1, result.memberCount());
        Assertions.assertEquals(10, result.leaderUserRoleId());
        Assertions.assertTrue(result.currentUserLeader());
        Assertions.assertFalse(result.membershipValid());
        Assertions.assertEquals(8, result.joinCode().length());
        verify(memberRepository).save(any(TeamMemberEntity.class));
    }

    @Test
    void createTeam_shouldRejectSecondTeamInSameEvent() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        TrackEntity track = track(20, 30, "Web Platform");

        stubCurrentStudent(leader);
        when(trackRepository.findById(20)).thenReturn(Optional.of(track));
        when(eventRepository.findById(30)).thenReturn(Optional.of(registrationOpenEvent(30)));
        when(memberRepository.existsMembershipInEvent(10, 30)).thenReturn(true);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> teamService.createTeam(authentication("leader@example.com"), new CreateTeamRequest(20, "Another Team")));

        Assertions.assertTrue(ex.getMessage().contains("already belong to a team"));
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
    void transferLeadership_shouldAssignExistingMember() {
        StudentProfileEntity leader = student(1, 10, "leader@example.com", "Team Leader");
        StudentProfileEntity member = student(2, 11, "member@example.com", "Team Member");
        TeamEntity team = ledTeam(leader);

        stubCurrentStudent(leader);
        when(teamRepository.findDetailedById(40)).thenReturn(Optional.of(team));
        when(eventRepository.findById(30)).thenReturn(Optional.of(registrationOpenEvent(30)));
        when(memberRepository.existsByTeamTeamIdAndStudentUserRoleId(40, 11)).thenReturn(true);
        when(studentProfileRepository.findById(11)).thenReturn(Optional.of(member));
        when(teamRepository.save(team)).thenReturn(team);
        when(memberRepository.findByTeamTeamIdOrderByJoinedAtAsc(40)).thenReturn(List.of());
        when(submissionRepository.findTopByTeamTeamIdOrderBySubmittedAtDesc(40)).thenReturn(Optional.empty());

        TeamDto result = teamService.transferLeadership(authentication("leader@example.com"), 40, 11);

        Assertions.assertEquals(member, team.getLeader());
        Assertions.assertEquals(11, result.leaderUserRoleId());
        Assertions.assertFalse(result.currentUserLeader());
        verify(teamRepository).save(team);
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

    private HackathonEventEntity registrationOpenEvent(Integer eventId) {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(eventId);
        event.setName("SEAL Summer 2026");
        event.setStatus(EventStatus.REGISTRATION_OPEN.getDbValue());
        return event;
    }
}
