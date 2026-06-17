package com.seal.hackathon.submission;

import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserRoleEntity;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.submission.dto.SubmissionRequest;
import com.seal.hackathon.submission.entity.SubmissionEntity;
import com.seal.hackathon.submission.entity.SubmissionHistoryEntity;
import com.seal.hackathon.submission.entity.SubmissionStatus;
import com.seal.hackathon.submission.repository.SubmissionHistoryRepository;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import com.seal.hackathon.submission.service.SubmissionService;
import com.seal.hackathon.team.entity.TeamEntity;
import com.seal.hackathon.team.repository.TeamMemberRepository;
import com.seal.hackathon.team.repository.TeamRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubmissionServiceTest {

    @Mock
    private SubmissionRepository submissionRepository;
    @Mock
    private SubmissionHistoryRepository historyRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private TeamMemberRepository memberRepository;
    @Mock
    private RoundRepository roundRepository;
    @Mock
    private HackathonEventRepository eventRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private StudentProfileRepository studentProfileRepository;

    private SubmissionService submissionService;
    private UserEntity leaderUser;
    private StudentProfileEntity leader;
    private StudentProfileEntity member;
    private TeamEntity team;
    private RoundEntity round;
    private HackathonEventEntity event;
    private UsernamePasswordAuthenticationToken leaderAuth;

    @BeforeEach
    void setUp() {
        submissionService = new SubmissionService(
                submissionRepository,
                historyRepository,
                teamRepository,
                memberRepository,
                roundRepository,
                eventRepository,
                userRepository,
                studentProfileRepository
        );

        leaderUser = user(1, "leader@seal.test", "Team Leader");
        leader = student(21, leaderUser);
        member = student(22, user(2, "member@seal.test", "Team Member"));

        TrackEntity track = new TrackEntity();
        track.setTrackId(5);
        track.setEventId(10);
        track.setName("Emerging Technologies");

        team = new TeamEntity();
        team.setTeamId(30);
        team.setTeamName("Agile Seals");
        team.setTrack(track);
        team.setLeader(leader);

        round = new RoundEntity();
        round.setRoundId(40);
        round.setEventId(10);
        round.setRoundName("Elimination");
        round.setRoundOrder(1);
        round.setSubmissionDeadline(LocalDateTime.now().plusDays(2));

        event = new HackathonEventEntity();
        event.setEventId(10);
        event.setName("SEAL Summer 2026");
        event.setSemester("Summer");
        event.setYear(2026);
        event.setStartDate(LocalDate.now());
        event.setEndDate(LocalDate.now().plusDays(10));
        event.setStatus("Ongoing");

        leaderAuth = new UsernamePasswordAuthenticationToken("leader@seal.test", "password");
    }

    @Test
    void createSubmission_shouldRequireTeamLeader() {
        mockCurrentStudent(member);
        when(teamRepository.findDetailedById(30)).thenReturn(Optional.of(team));
        when(roundRepository.findById(40)).thenReturn(Optional.of(round));

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> submissionService.createSubmission(
                        new UsernamePasswordAuthenticationToken("member@seal.test", "password"),
                        30,
                        40,
                        request("https://github.com/seal/team")
                ));

        Assertions.assertTrue(ex.getMessage().contains("Only the team leader"));
    }

    @Test
    void createSubmission_shouldRejectInvalidRepositoryUrl() {
        mockCurrentStudent(leader);
        mockSubmissionWindow();

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> submissionService.createSubmission(leaderAuth, 30, 40, request("github.com/seal/team")));

        Assertions.assertTrue(ex.getMessage().contains("Repository URL must be a valid"));
    }

    @Test
    void createSubmission_shouldRejectNonGitRepositoryHost() {
        mockCurrentStudent(leader);
        mockSubmissionWindow();

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> submissionService.createSubmission(leaderAuth, 30, 40, request("https://example.com/seal/team")));

        Assertions.assertTrue(ex.getMessage().contains("GitHub or GitLab"));
    }

    @Test
    void createSubmission_shouldRejectAfterDeadline() {
        mockCurrentStudent(leader);
        round.setSubmissionDeadline(LocalDateTime.now().minusMinutes(1));
        mockSubmissionWindow();
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> submissionService.createSubmission(leaderAuth, 30, 40, request("https://github.com/seal/team")));

        Assertions.assertTrue(ex.getMessage().contains("deadline"));
    }

    @Test
    void createSubmission_shouldRejectDuplicateTeamRoundSubmission() {
        mockCurrentStudent(leader);
        mockValidSubmissionWindow();
        when(submissionRepository.findByTeamTeamIdAndRoundRoundId(30, 40))
                .thenReturn(Optional.of(submission("https://github.com/seal/existing")));

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> submissionService.createSubmission(leaderAuth, 30, 40, request("https://github.com/seal/team")));

        Assertions.assertTrue(ex.getMessage().contains("already has a submission"));
    }

    @Test
    void createSubmission_shouldRequireQualifiedPreviousRoundForLaterRound() {
        mockCurrentStudent(leader);
        round.setRoundOrder(2);
        RoundEntity previousRound = new RoundEntity();
        previousRound.setRoundId(39);
        previousRound.setEventId(10);
        previousRound.setRoundName("Elimination");
        previousRound.setRoundOrder(1);
        previousRound.setSubmissionDeadline(LocalDateTime.now().minusDays(1));
        previousRound.setPromotionRuleTopN(3);

        mockSubmissionWindow();
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(memberRepository.countByTeamTeamId(30)).thenReturn(3L);
        when(roundRepository.findByEventIdAndRoundOrder(10, 1)).thenReturn(Optional.of(previousRound));
        when(submissionRepository.existsQualifiedRanking(30, 39)).thenReturn(false);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> submissionService.createSubmission(leaderAuth, 30, 40, request("https://github.com/seal/team")));

        Assertions.assertTrue(ex.getMessage().contains("not qualified"));
    }

    @Test
    void updateSubmission_shouldRequireQualifiedPreviousRoundForLaterRound() {
        mockCurrentStudent(leader);
        round.setRoundOrder(2);
        RoundEntity previousRound = new RoundEntity();
        previousRound.setRoundId(39);
        previousRound.setEventId(10);
        previousRound.setRoundName("Elimination");
        previousRound.setRoundOrder(1);
        previousRound.setSubmissionDeadline(LocalDateTime.now().minusDays(1));
        previousRound.setPromotionRuleTopN(3);

        SubmissionEntity existing = submission("https://github.com/seal/old");
        when(submissionRepository.findDetailedById(99)).thenReturn(Optional.of(existing));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(memberRepository.countByTeamTeamId(30)).thenReturn(3L);
        when(roundRepository.findByEventIdAndRoundOrder(10, 1)).thenReturn(Optional.of(previousRound));
        when(submissionRepository.existsQualifiedRanking(30, 39)).thenReturn(false);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> submissionService.updateSubmission(leaderAuth, 99, request("https://github.com/seal/new")));

        Assertions.assertTrue(ex.getMessage().contains("not qualified"));
    }

    @Test
    void updateSubmission_shouldRecordSubmissionHistory() {
        mockCurrentStudent(leader);
        SubmissionEntity existing = submission("https://github.com/seal/old");
        when(submissionRepository.findDetailedById(99)).thenReturn(Optional.of(existing));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(memberRepository.countByTeamTeamId(30)).thenReturn(3L);
        when(submissionRepository.save(any(SubmissionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        submissionService.updateSubmission(
                leaderAuth,
                99,
                new SubmissionRequest(
                        "https://github.com/seal/new",
                        "https://demo.seal.test",
                        "https://slides.seal.test"
                )
        );

        ArgumentCaptor<SubmissionHistoryEntity> captor = ArgumentCaptor.forClass(SubmissionHistoryEntity.class);
        verify(historyRepository).save(captor.capture());
        SubmissionHistoryEntity history = captor.getValue();
        Assertions.assertEquals("UPDATED", history.getActionType());
        Assertions.assertEquals("https://github.com/seal/old", history.getOldRepositoryUrl());
        Assertions.assertEquals("https://github.com/seal/new", history.getNewRepositoryUrl());
    }

    private void mockSubmissionWindow() {
        when(teamRepository.findDetailedById(30)).thenReturn(Optional.of(team));
        when(roundRepository.findById(40)).thenReturn(Optional.of(round));
    }

    private void mockValidSubmissionWindow() {
        mockSubmissionWindow();
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(memberRepository.countByTeamTeamId(30)).thenReturn(3L);
    }

    private void mockCurrentStudent(StudentProfileEntity student) {
        UserEntity user = student.getUserRole().getUser();
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(studentProfileRepository.findByUserRoleUserUserId(user.getUserId())).thenReturn(Optional.of(student));
    }

    private SubmissionRequest request(String repositoryUrl) {
        return new SubmissionRequest(repositoryUrl, null, null);
    }

    private SubmissionEntity submission(String repositoryUrl) {
        SubmissionEntity submission = new SubmissionEntity();
        submission.setSubmissionId(99);
        submission.setTeam(team);
        submission.setRound(round);
        submission.setSubmittedBy(leader);
        submission.setRepositoryUrl(repositoryUrl);
        submission.setStatus(SubmissionStatus.SUBMITTED.getDbValue());
        submission.setSubmittedAt(LocalDateTime.now());
        submission.setUpdatedAt(LocalDateTime.now());
        return submission;
    }

    private StudentProfileEntity student(Integer userRoleId, UserEntity user) {
        UserRoleEntity role = new UserRoleEntity();
        role.setUserRoleId(userRoleId);
        role.setUser(user);
        role.setRoleType("Student");

        StudentProfileEntity student = new StudentProfileEntity();
        student.setUserRoleId(userRoleId);
        student.setUserRole(role);
        student.setStudentType("FPT");
        student.setStudentCode("SE" + userRoleId);
        student.setUniversityName("FPT University HCMC");
        return student;
    }

    private UserEntity user(Integer userId, String email, String fullName) {
        UserEntity user = new UserEntity();
        user.setUserId(userId);
        user.setEmail(email);
        user.setUsername(email.substring(0, email.indexOf("@")));
        user.setFullName(fullName);
        user.setPasswordHash("hash");
        user.setStatus("Active");
        user.setApproved(true);
        user.setCreatedAt(LocalDateTime.now());
        return user;
    }
}
