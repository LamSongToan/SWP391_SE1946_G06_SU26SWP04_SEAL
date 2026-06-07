package com.seal.hackathon.team.service;

import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserStatus;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.TrackDto;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.submission.entity.SubmissionEntity;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import com.seal.hackathon.team.dto.CreateTeamRequest;
import com.seal.hackathon.team.dto.TeamDto;
import com.seal.hackathon.team.dto.TeamInvitationDto;
import com.seal.hackathon.team.dto.TeamMemberDto;
import com.seal.hackathon.team.entity.TeamEntity;
import com.seal.hackathon.team.entity.TeamInvitationEntity;
import com.seal.hackathon.team.entity.TeamMemberEntity;
import com.seal.hackathon.team.entity.TeamMemberId;
import com.seal.hackathon.team.repository.TeamInvitationRepository;
import com.seal.hackathon.team.repository.TeamMemberRepository;
import com.seal.hackathon.team.repository.TeamRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class TeamService {

    private static final int MIN_TEAM_SIZE = 3;
    private static final int MAX_TEAM_SIZE = 5;
    private static final String TEAM_STATUS_FORMING = "Forming";
    private static final String TEAM_STATUS_READY = "Ready";

    private final TeamRepository teamRepository;
    private final TeamMemberRepository memberRepository;
    private final TeamInvitationRepository invitationRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final TrackRepository trackRepository;
    private final HackathonEventRepository eventRepository;
    private final SubmissionRepository submissionRepository;

    public TeamService(TeamRepository teamRepository,
                       TeamMemberRepository memberRepository,
                       TeamInvitationRepository invitationRepository,
                       StudentProfileRepository studentProfileRepository,
                       UserRepository userRepository,
                       TrackRepository trackRepository,
                       HackathonEventRepository eventRepository,
                       SubmissionRepository submissionRepository) {
        this.teamRepository = teamRepository;
        this.memberRepository = memberRepository;
        this.invitationRepository = invitationRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
        this.trackRepository = trackRepository;
        this.eventRepository = eventRepository;
        this.submissionRepository = submissionRepository;
    }

    @Transactional(readOnly = true)
    public List<TeamDto> listMyTeams(Authentication authentication) {
        StudentProfileEntity student = currentStudent(authentication);
        return teamRepository.findTeamsForUser(student.getUserRole().getUser().getUserId())
                .stream()
                .map(team -> toTeamDto(team, student.getUserRoleId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public TeamDto getTeam(Authentication authentication, Integer teamId) {
        StudentProfileEntity student = currentStudent(authentication);
        TeamEntity team = getTeamOrThrow(teamId);
        requireMember(teamId, student.getUserRoleId());
        return toTeamDto(team, student.getUserRoleId());
    }

    @Transactional(readOnly = true)
    public List<TrackDto> listRegistrationTracks(Integer eventId) {
        HackathonEventEntity event = getEventOrThrow(eventId);
        requireRegistrationOpen(event);
        return trackRepository.findByEventIdOrderByTrackIdAsc(eventId)
                .stream()
                .map(track -> new TrackDto(track.getTrackId(), track.getEventId(), track.getName()))
                .toList();
    }

    @Transactional
    public TeamDto createTeam(Authentication authentication, CreateTeamRequest request) {
        StudentProfileEntity leader = currentStudent(authentication);
        TrackEntity track = trackRepository.findById(request.trackId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Track not found"));
        HackathonEventEntity event = getEventOrThrow(track.getEventId());
        requireRegistrationOpen(event);

        if (memberRepository.existsMembershipInEvent(leader.getUserRoleId(), event.getEventId())) {
            throw new ApiException(HttpStatus.CONFLICT, "You already belong to a team in this event");
        }

        String teamName = request.teamName().trim();
        if (teamRepository.existsByEventIdAndTeamNameIgnoreCase(event.getEventId(), teamName)) {
            throw new ApiException(HttpStatus.CONFLICT, "Team name already exists in this event");
        }

        TeamEntity team = new TeamEntity();
        team.setTrack(track);
        team.setLeader(leader);
        team.setTeamName(teamName);
        team = teamRepository.save(team);
        addMember(team, leader);
        updateTeamMembershipStatus(team);
        return toTeamDto(team, leader.getUserRoleId());
    }

    @Transactional
    public TeamInvitationDto inviteMember(Authentication authentication, Integer teamId, String identifier) {
        StudentProfileEntity leader = currentStudent(authentication);
        TeamEntity team = getTeamOrThrow(teamId);
        requireLeader(team, leader);
        requireTeamRegistrationOpen(team);
        requireAvailableInvitationSlot(teamId);

        UserEntity invitedUser = findUserByIdentifier(identifier);
        requireActiveAccount(invitedUser);
        StudentProfileEntity invitee = studentProfileRepository.findByUserRoleUserUserId(invitedUser.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Only student accounts can join teams"));

        if (invitee.getUserRoleId().equals(leader.getUserRoleId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Team leader is already a member");
        }
        validateCanJoin(team, invitee);

        invitationRepository.findByTeamTeamIdAndInviteeUserRoleIdAndStatusIgnoreCase(
                teamId, invitee.getUserRoleId(), "Pending"
        ).ifPresent(existing -> {
            throw new ApiException(HttpStatus.CONFLICT, "A pending invitation already exists for this student");
        });

        TeamInvitationEntity invitation = new TeamInvitationEntity();
        invitation.setTeam(team);
        invitation.setInvitee(invitee);
        invitation.setInvitedBy(leader);
        return toInvitationDto(invitationRepository.save(invitation));
    }

    @Transactional(readOnly = true)
    public List<TeamInvitationDto> listMyInvitations(Authentication authentication) {
        StudentProfileEntity student = currentStudent(authentication);
        return invitationRepository
                .findByInviteeUserRoleUserUserIdOrderByCreatedAtDesc(student.getUserRole().getUser().getUserId())
                .stream()
                .map(this::toInvitationDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamInvitationDto> listTeamInvitations(Authentication authentication, Integer teamId) {
        StudentProfileEntity leader = currentStudent(authentication);
        TeamEntity team = getTeamOrThrow(teamId);
        requireLeader(team, leader);
        return invitationRepository.findByTeamTeamIdOrderByCreatedAtDesc(teamId)
                .stream()
                .map(this::toInvitationDto)
                .toList();
    }

    @Transactional
    public TeamDto acceptInvitation(Authentication authentication, Integer invitationId) {
        StudentProfileEntity student = currentStudent(authentication);
        TeamInvitationEntity invitation = getInvitationOrThrow(invitationId);
        requireInvitee(invitation, student);
        requirePending(invitation);
        requireTeamRegistrationOpen(invitation.getTeam());
        requireAvailableSlot(invitation.getTeam().getTeamId());
        validateCanJoin(invitation.getTeam(), student);

        addMember(invitation.getTeam(), student);
        updateTeamMembershipStatus(invitation.getTeam());
        invitation.setStatus("Accepted");
        invitation.setRespondedAt(LocalDateTime.now());
        invitationRepository.save(invitation);
        return toTeamDto(invitation.getTeam(), student.getUserRoleId());
    }

    @Transactional
    public TeamInvitationDto rejectInvitation(Authentication authentication, Integer invitationId) {
        StudentProfileEntity student = currentStudent(authentication);
        TeamInvitationEntity invitation = getInvitationOrThrow(invitationId);
        requireInvitee(invitation, student);
        requirePending(invitation);

        invitation.setStatus("Rejected");
        invitation.setRespondedAt(LocalDateTime.now());
        return toInvitationDto(invitationRepository.save(invitation));
    }

    @Transactional
    public TeamInvitationDto cancelInvitation(Authentication authentication, Integer teamId, Integer invitationId) {
        StudentProfileEntity leader = currentStudent(authentication);
        TeamEntity team = getTeamOrThrow(teamId);
        requireLeader(team, leader);
        requireTeamRegistrationOpen(team);

        TeamInvitationEntity invitation = getInvitationOrThrow(invitationId);
        if (!invitation.getTeam().getTeamId().equals(teamId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invitation does not belong to this team");
        }
        requirePending(invitation);
        invitation.setStatus("Cancelled");
        invitation.setRespondedAt(LocalDateTime.now());
        return toInvitationDto(invitationRepository.save(invitation));
    }

    @Transactional
    public TeamDto joinByCode(Authentication authentication, String rawJoinCode) {
        StudentProfileEntity student = currentStudent(authentication);
        String joinCode = rawJoinCode.trim().toUpperCase(Locale.ROOT);
        TeamEntity team = teamRepository.findByJoinCodeIgnoreCase(joinCode)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Invalid team join code"));
        requireTeamRegistrationOpen(team);
        requireAvailableSlot(team.getTeamId());
        validateCanJoin(team, student);
        addMember(team, student);
        updateTeamMembershipStatus(team);
        return toTeamDto(team, student.getUserRoleId());
    }

    @Transactional
    public TeamDto removeMember(Authentication authentication, Integer teamId, Integer userRoleId) {
        StudentProfileEntity leader = currentStudent(authentication);
        TeamEntity team = getTeamOrThrow(teamId);
        requireLeader(team, leader);
        requireTeamRegistrationOpen(team);

        if (team.getLeader().getUserRoleId().equals(userRoleId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Team leader cannot be removed from the team");
        }

        TeamMemberId id = new TeamMemberId(teamId, userRoleId);
        if (!memberRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Team member not found");
        }
        memberRepository.deleteById(id);
        updateTeamMembershipStatus(team);
        return toTeamDto(team, leader.getUserRoleId());
    }

    @Transactional
    public TeamDto transferLeadership(Authentication authentication, Integer teamId, Integer newLeaderUserRoleId) {
        StudentProfileEntity leader = currentStudent(authentication);
        TeamEntity team = getTeamOrThrow(teamId);
        requireLeader(team, leader);
        requireTeamRegistrationOpen(team);

        if (team.getLeader().getUserRoleId().equals(newLeaderUserRoleId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Selected member is already the team leader");
        }
        if (!memberRepository.existsByTeamTeamIdAndStudentUserRoleId(teamId, newLeaderUserRoleId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "New team leader must be an existing team member");
        }

        StudentProfileEntity newLeader = studentProfileRepository.findById(newLeaderUserRoleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Student profile not found"));
        team.setLeader(newLeader);
        return toTeamDto(teamRepository.save(team), leader.getUserRoleId());
    }

    @Transactional
    public void leaveTeam(Authentication authentication, Integer teamId) {
        StudentProfileEntity student = currentStudent(authentication);
        TeamEntity team = getTeamOrThrow(teamId);
        requireTeamRegistrationOpen(team);
        requireMember(teamId, student.getUserRoleId());

        if (team.getLeader().getUserRoleId().equals(student.getUserRoleId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Transfer team leadership before leaving the team");
        }
        memberRepository.deleteById(new TeamMemberId(teamId, student.getUserRoleId()));
        updateTeamMembershipStatus(team);
    }

    @Transactional
    public void disbandTeam(Authentication authentication, Integer teamId) {
        StudentProfileEntity leader = currentStudent(authentication);
        TeamEntity team = getTeamOrThrow(teamId);
        requireLeader(team, leader);
        requireTeamRegistrationOpen(team);

        if (teamRepository.countSubmissionsByTeamId(teamId) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "Team cannot be disbanded after a submission has been created");
        }
        memberRepository.deleteByTeamTeamId(teamId);
        teamRepository.delete(team);
    }

    private StudentProfileEntity currentStudent(Authentication authentication) {
        if (authentication == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        UserEntity user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return studentProfileRepository.findByUserRoleUserUserId(user.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Student profile is required"));
    }

    private UserEntity findUserByIdentifier(String rawIdentifier) {
        String identifier = rawIdentifier.trim();
        return (identifier.contains("@")
                ? userRepository.findByEmailIgnoreCase(identifier)
                : userRepository.findByUsernameIgnoreCase(identifier))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Student account not found"));
    }

    private void validateCanJoin(TeamEntity team, StudentProfileEntity student) {
        if (memberRepository.existsByTeamTeamIdAndStudentUserRoleId(team.getTeamId(), student.getUserRoleId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Student is already a member of this team");
        }
        if (memberRepository.existsMembershipInEvent(student.getUserRoleId(), team.getTrack().getEventId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Student already belongs to another team in this event");
        }
    }

    private void addMember(TeamEntity team, StudentProfileEntity student) {
        TeamMemberEntity member = new TeamMemberEntity();
        member.setId(new TeamMemberId(team.getTeamId(), student.getUserRoleId()));
        member.setTeam(team);
        member.setStudent(student);
        memberRepository.save(member);
    }

    private void updateTeamMembershipStatus(TeamEntity team) {
        long memberCount = memberRepository.countByTeamTeamId(team.getTeamId());
        team.setStatus(resolveTeamStatus(memberCount));
        teamRepository.save(team);
    }

    private String resolveTeamStatus(long memberCount) {
        return memberCount >= MIN_TEAM_SIZE && memberCount <= MAX_TEAM_SIZE
                ? TEAM_STATUS_READY
                : TEAM_STATUS_FORMING;
    }

    private TeamEntity getTeamOrThrow(Integer teamId) {
        return teamRepository.findDetailedById(teamId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Team not found"));
    }

    private TeamInvitationEntity getInvitationOrThrow(Integer invitationId) {
        return invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Team invitation not found"));
    }

    private HackathonEventEntity getEventOrThrow(Integer eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    private void requireRegistrationOpen(HackathonEventEntity event) {
        if (EventStatus.from(event.getStatus()) != EventStatus.REGISTRATION_OPEN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Team registration is open only during RegistrationOpen status");
        }
    }

    private void requireTeamRegistrationOpen(TeamEntity team) {
        requireRegistrationOpen(getEventOrThrow(team.getTrack().getEventId()));
    }

    private void requireActiveAccount(UserEntity user) {
        if (!Boolean.TRUE.equals(user.getApproved()) || !UserStatus.ACTIVE.isActiveValue(user.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Student account must be approved and active before joining a team");
        }
    }

    private void requireLeader(TeamEntity team, StudentProfileEntity student) {
        if (!team.getLeader().getUserRoleId().equals(student.getUserRoleId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only team leader can perform this action");
        }
    }

    private void requireMember(Integer teamId, Integer userRoleId) {
        if (!memberRepository.existsByTeamTeamIdAndStudentUserRoleId(teamId, userRoleId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You are not a member of this team");
        }
    }

    private void requireAvailableSlot(Integer teamId) {
        if (memberRepository.countByTeamTeamId(teamId) >= MAX_TEAM_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Team already has the maximum of 5 members");
        }
    }

    private void requireAvailableInvitationSlot(Integer teamId) {
        long occupiedSlots = memberRepository.countByTeamTeamId(teamId)
                + invitationRepository.countByTeamTeamIdAndStatusIgnoreCase(teamId, "Pending");
        if (occupiedSlots >= MAX_TEAM_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Team has no available slots after pending invitations");
        }
    }

    private void requireInvitee(TeamInvitationEntity invitation, StudentProfileEntity student) {
        if (!invitation.getInvitee().getUserRoleId().equals(student.getUserRoleId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This invitation belongs to another student");
        }
    }

    private void requirePending(TeamInvitationEntity invitation) {
        if (!"Pending".equalsIgnoreCase(invitation.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invitation has already been processed");
        }
    }

    private TeamDto toTeamDto(TeamEntity team, Integer currentUserRoleId) {
        List<TeamMemberDto> members = memberRepository.findByTeamTeamIdOrderByJoinedAtAsc(team.getTeamId())
                .stream()
                .map(member -> toMemberDto(member, team.getLeader().getUserRoleId()))
                .toList();
        int memberCount = members.size();
        HackathonEventEntity event = getEventOrThrow(team.getTrack().getEventId());
        boolean deletable = teamRepository.countSubmissionsByTeamId(team.getTeamId()) == 0;
        boolean valid = memberCount >= MIN_TEAM_SIZE && memberCount <= MAX_TEAM_SIZE;
        String validationMessage = valid
                ? "Team is ready with " + memberCount + " members"
                : "Invite " + (MIN_TEAM_SIZE - memberCount) + " more member(s) to reach the required minimum";
        SubmissionEntity latestSubmission = submissionRepository
                .findTopByTeamTeamIdOrderBySubmittedAtDesc(team.getTeamId())
                .orElse(null);

        return new TeamDto(
                team.getTeamId(),
                team.getTeamName(),
                team.getJoinCode(),
                resolveTeamStatus(memberCount),
                team.getTrack().getTrackId(),
                team.getTrack().getName(),
                event.getEventId(),
                event.getName(),
                team.getLeader().getUserRoleId(),
                team.getLeader().getUserRole().getUser().getFullName(),
                memberCount,
                valid,
                validationMessage,
                team.getLeader().getUserRoleId().equals(currentUserRoleId),
                deletable,
                team.getCreatedAt(),
                members,
                latestSubmission == null ? null : latestSubmission.getStatus(),
                latestSubmission == null ? null : latestSubmission.getRound().getRoundName(),
                latestSubmission == null ? null : latestSubmission.getRound().getSubmissionDeadline()
        );
    }

    private TeamMemberDto toMemberDto(TeamMemberEntity member, Integer leaderUserRoleId) {
        UserEntity user = member.getStudent().getUserRole().getUser();
        return new TeamMemberDto(
                member.getStudent().getUserRoleId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                member.getStudent().getUserRoleId().equals(leaderUserRoleId),
                member.getJoinedAt()
        );
    }

    private TeamInvitationDto toInvitationDto(TeamInvitationEntity invitation) {
        TeamEntity team = invitation.getTeam();
        HackathonEventEntity event = getEventOrThrow(team.getTrack().getEventId());
        return new TeamInvitationDto(
                invitation.getInvitationId(),
                team.getTeamId(),
                team.getTeamName(),
                team.getTrack().getName(),
                event.getName(),
                invitation.getInvitedBy().getUserRole().getUser().getFullName(),
                invitation.getInvitee().getUserRole().getUser().getFullName(),
                invitation.getInvitee().getUserRole().getUser().getUsername(),
                invitation.getStatus(),
                invitation.getCreatedAt(),
                invitation.getRespondedAt()
        );
    }
}
