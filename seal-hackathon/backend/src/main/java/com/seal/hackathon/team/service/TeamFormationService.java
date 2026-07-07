package com.seal.hackathon.team.service;

import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.evaluation.service.AuditLogService;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.entity.TrackMentorEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.TrackMentorRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.event.service.EventUpdateNotificationService;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import com.seal.hackathon.team.dto.IndividualRegistrationDto;
import com.seal.hackathon.team.dto.TeamDto;
import com.seal.hackathon.team.dto.TeamFormationActionRequiredDto;
import com.seal.hackathon.team.dto.TeamFormationDashboardDto;
import com.seal.hackathon.team.dto.TeamFormationTrackDto;
import com.seal.hackathon.team.dto.TeamMemberDto;
import com.seal.hackathon.team.entity.IndividualRegistrationEntity;
import com.seal.hackathon.team.entity.TeamEntity;
import com.seal.hackathon.team.entity.TeamMemberEntity;
import com.seal.hackathon.team.entity.TeamMemberId;
import com.seal.hackathon.team.repository.IndividualRegistrationRepository;
import com.seal.hackathon.team.repository.TeamMemberRepository;
import com.seal.hackathon.team.repository.TeamRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class TeamFormationService {

    private static final int DEFAULT_MIN_TEAM_SIZE = 3;
    private static final int DEFAULT_MAX_TEAM_SIZE = 5;
    private static final String STATUS_WAITING = "Waiting";
    private static final String STATUS_MATCHED = "Matched";

    private final IndividualRegistrationRepository individualRegistrationRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final HackathonEventRepository eventRepository;
    private final TrackRepository trackRepository;
    private final TrackMentorRepository trackMentorRepository;
    private final SubmissionRepository submissionRepository;
    private final AuditLogService auditLogService;
    private final EventUpdateNotificationService notificationService;

    public TeamFormationService(IndividualRegistrationRepository individualRegistrationRepository,
                                TeamRepository teamRepository,
                                TeamMemberRepository teamMemberRepository,
                                StudentProfileRepository studentProfileRepository,
                                UserRepository userRepository,
                                HackathonEventRepository eventRepository,
                                TrackRepository trackRepository,
                                TrackMentorRepository trackMentorRepository,
                                SubmissionRepository submissionRepository,
                                AuditLogService auditLogService,
                                EventUpdateNotificationService notificationService) {
        this.individualRegistrationRepository = individualRegistrationRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
        this.eventRepository = eventRepository;
        this.trackRepository = trackRepository;
        this.trackMentorRepository = trackMentorRepository;
        this.submissionRepository = submissionRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    @Transactional
    public IndividualRegistrationDto registerIndividual(Authentication authentication, Integer eventId) {
        StudentProfileEntity student = currentStudent(authentication);
        HackathonEventEntity event = getEventOrThrow(eventId);
        requireEventRegistrationAvailable(event);
        if (teamMemberRepository.existsMembershipInEvent(student.getUserRoleId(), eventId)) {
            throw new ApiException(HttpStatus.CONFLICT, "You already belong to a team in this event");
        }
        if (individualRegistrationRepository.existsByEventEventIdAndStudentUserRoleIdAndStatusIgnoreCase(
                eventId, student.getUserRoleId(), STATUS_WAITING)) {
            throw new ApiException(HttpStatus.CONFLICT, "You are already waiting for automatic team matching in this event");
        }

        IndividualRegistrationEntity registration = new IndividualRegistrationEntity();
        registration.setEvent(event);
        registration.setStudent(student);
        IndividualRegistrationEntity saved = individualRegistrationRepository.save(registration);
        autoMatchWaitingIndividuals(event);
        return individualRegistrationRepository
                .findByEventEventIdAndStudentUserRoleId(eventId, student.getUserRoleId())
                .map(this::toIndividualDto)
                .orElseGet(() -> toIndividualDto(saved));
    }

    @Transactional(readOnly = true)
    public List<IndividualRegistrationDto> listMyIndividualRegistrations(Authentication authentication) {
        StudentProfileEntity student = currentStudent(authentication);
        return individualRegistrationRepository
                .findByStudentUserRoleIdOrderByCreatedAtDesc(student.getUserRoleId())
                .stream()
                .map(this::toIndividualDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public TeamFormationDashboardDto getFormationDashboard(Integer eventId) {
        HackathonEventEntity event = getEventOrThrow(eventId);
        List<TeamEntity> teams = teamRepository.findDetailedByEventId(eventId);
        List<TeamDto> teamDtos = teams.stream()
                .map(team -> toTeamDto(team, null))
                .toList();
        List<IndividualRegistrationDto> waiting = individualRegistrationRepository
                .findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(eventId, STATUS_WAITING)
                .stream()
                .map(this::toIndividualDto)
                .toList();
        Map<Integer, String> mentorNamesByTrack = trackMentorRepository.findByTrackEventId(eventId)
                .stream()
                .collect(Collectors.groupingBy(
                        item -> item.getTrack().getTrackId(),
                        LinkedHashMap::new,
                        Collectors.mapping(this::mentorName, Collectors.joining(", "))
                ));
        List<TeamFormationTrackDto> tracks = trackRepository.findByEventIdOrderByTrackIdAsc(eventId)
                .stream()
                .map(track -> new TeamFormationTrackDto(
                        track.getTrackId(),
                        track.getName(),
                        track.getMinTeams(),
                        track.getMaxTeams(),
                        teamRepository.countByTrackTrackId(track.getTrackId()),
                        mentorNamesByTrack.getOrDefault(track.getTrackId(), "No mentor assigned")
                ))
                .toList();
        List<TeamFormationActionRequiredDto> actionRequired = buildActionRequired(event, teamDtos, waiting, tracks);
        return new TeamFormationDashboardDto(
                event.getEventId(),
                event.getName(),
                event.getStatus(),
                event.getRegistrationEndAt(),
                minTeamSize(event),
                maxTeamSize(event),
                event.getTrackSelectionMode(),
                event.getRegistrationEndAt() != null && LocalDateTime.now().isAfter(event.getRegistrationEndAt()),
                actionRequired,
                teamDtos,
                waiting,
                tracks
        );
    }

    @Transactional
    public TeamFormationDashboardDto autoMatchWaitingIndividuals(Integer eventId) {
        HackathonEventEntity event = getEventOrThrow(eventId);
        autoMatchWaitingIndividuals(event);
        return getFormationDashboard(eventId);
    }

    @Transactional
    public TeamFormationDashboardDto assignIndividualToTeam(Integer eventId, Integer individualRegistrationId, Integer teamId) {
        HackathonEventEntity event = getEventOrThrow(eventId);
        assignSingleIndividualToTeam(event, individualRegistrationId, teamId);
        return getFormationDashboard(eventId);
    }

    @Transactional
    public TeamFormationDashboardDto bulkAssignIndividualsToTeam(Integer eventId, List<Integer> individualRegistrationIds, Integer teamId) {
        if (individualRegistrationIds == null || individualRegistrationIds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose at least one waiting student to assign");
        }
        HackathonEventEntity event = getEventOrThrow(eventId);
        for (Integer individualRegistrationId : individualRegistrationIds.stream().distinct().toList()) {
            assignSingleIndividualToTeam(event, individualRegistrationId, teamId);
        }
        return getFormationDashboard(eventId);
    }

    private void assignSingleIndividualToTeam(HackathonEventEntity event, Integer individualRegistrationId, Integer teamId) {
        Integer eventId = event.getEventId();
        IndividualRegistrationEntity registration = individualRegistrationRepository.findById(individualRegistrationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Individual registration not found"));
        if (!registration.getEvent().getEventId().equals(eventId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Individual registration does not belong to this event");
        }
        if (!STATUS_WAITING.equalsIgnoreCase(registration.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only waiting individuals can be assigned");
        }
        TeamEntity team = teamRepository.findDetailedById(teamId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Team not found"));
        if (team.getTrack() == null || !team.getTrack().getEventId().equals(eventId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Target team does not belong to this event");
        }
        requireTeamHasSlot(team, event);
        if (teamMemberRepository.existsMembershipInEvent(registration.getStudent().getUserRoleId(), eventId)) {
            throw new ApiException(HttpStatus.CONFLICT, "Student already belongs to a team in this event");
        }
        addMember(team, registration.getStudent());
        updateTeamMembershipStatus(team, event);
        markMatched(registration, team);
        notifyMatched(registration, event, team);
        auditLogService.record(
                "INDIVIDUAL_ASSIGNED_TO_TEAM",
                "TEAM",
                team.getTeamId(),
                team.getTeamName(),
                null,
                Map.of("eventId", eventId, "individualRegistrationId", individualRegistrationId),
                "Coordinator assigned a leftover individual registration to an existing team"
        );
    }

    @Transactional
    public TeamFormationDashboardDto assignTeamTrack(Integer eventId, Integer teamId, Integer trackId) {
        throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "Track assignment is handled during event registration. Coordinators can review team tracks here, but not change them."
        );
    }

    private void autoMatchWaitingIndividuals(HackathonEventEntity event) {
        List<IndividualRegistrationEntity> waiting = new ArrayList<>(
                individualRegistrationRepository.findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(
                        event.getEventId(), STATUS_WAITING
                )
        );
        int minSize = minTeamSize(event);
        int maxSize = maxTeamSize(event);
        while (waiting.size() >= minSize) {
            int teamSize = Math.min(maxSize, waiting.size());
            if (waiting.size() - teamSize > 0 && waiting.size() - teamSize < minSize) {
                teamSize = waiting.size() - minSize;
            }
            if (teamSize < minSize) {
                break;
            }
            List<IndividualRegistrationEntity> group = new ArrayList<>(waiting.subList(0, teamSize));
            waiting.subList(0, teamSize).clear();
            createAutoMatchedTeam(event, group);
        }
    }

    private void createAutoMatchedTeam(HackathonEventEntity event, List<IndividualRegistrationEntity> group) {
        Collections.shuffle(group);
        TrackEntity track = resolveAutoTrack(event);
        IndividualRegistrationEntity leaderRegistration = group.get(0);
        TeamEntity team = new TeamEntity();
        team.setLeader(leaderRegistration.getStudent());
        team.setTeamName(generateAutoTeamName(event));
        team.setTrack(track);
        team = teamRepository.save(team);
        for (IndividualRegistrationEntity registration : group) {
            addMember(team, registration.getStudent());
            markMatched(registration, team);
            notifyMatched(registration, event, team);
        }
        updateTeamMembershipStatus(team, event);
        auditLogService.record(
                "INDIVIDUAL_TEAM_AUTO_MATCHED",
                "TEAM",
                team.getTeamId(),
                team.getTeamName(),
                null,
                Map.of("eventId", event.getEventId(), "memberCount", group.size(), "trackId", track == null ? null : track.getTrackId()),
                "System automatically matched individual registrations into a team"
        );
    }

    private TrackEntity resolveAutoTrack(HackathonEventEntity event) {
        List<TrackEntity> tracks = trackRepository.findByEventIdOrderByTrackIdAsc(event.getEventId());
        if (tracks.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This event does not have any tracks configured yet");
        }
        String mode = event.getTrackSelectionMode() == null ? "TEAM_SELECT" : event.getTrackSelectionMode().trim().toUpperCase(Locale.ROOT);
        if ("SINGLE_TRACK".equals(mode)) {
            TrackEntity track = tracks.get(0);
            requireTrackCapacity(track);
            return track;
        }
        List<TrackEntity> available = tracks.stream()
                .filter(this::trackHasCapacity)
                .toList();
        if (available.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No track has available team capacity");
        }
        return chooseBalancedTrack(available);
    }

    private String generateAutoTeamName(HackathonEventEntity event) {
        return "Auto Team " + event.getEventId() + "-" + System.currentTimeMillis();
    }

    private void markMatched(IndividualRegistrationEntity registration, TeamEntity team) {
        registration.setAssignedTeam(team);
        registration.setStatus(STATUS_MATCHED);
        registration.setMatchedAt(LocalDateTime.now());
        individualRegistrationRepository.save(registration);
    }

    private void notifyMatched(IndividualRegistrationEntity registration, HackathonEventEntity event, TeamEntity team) {
        UserEntity user = registration.getStudent().getUserRole().getUser();
        notificationService.notifyTeamMatched(user, event, team);
    }

    private List<TeamFormationActionRequiredDto> buildActionRequired(HackathonEventEntity event,
                                                                     List<TeamDto> teams,
                                                                     List<IndividualRegistrationDto> waiting,
                                                                     List<TeamFormationTrackDto> tracks) {
        List<TeamFormationActionRequiredDto> items = new ArrayList<>();
        boolean closed = event.getRegistrationEndAt() != null && LocalDateTime.now().isAfter(event.getRegistrationEndAt());
        if (closed && !waiting.isEmpty()) {
            items.add(new TeamFormationActionRequiredDto(
                    "WAITING_INDIVIDUALS",
                    "warning",
                    waiting.size() + " student(s) are still waiting for team assignment after the registration deadline.",
                    null,
                    null,
                    waiting.get(0).individualRegistrationId()
            ));
        }
        for (TeamDto team : teams) {
            if (!team.membershipValid()) {
                items.add(new TeamFormationActionRequiredDto(
                        "TEAM_MISSING_MEMBERS",
                        closed ? "error" : "warning",
                        team.teamName() + " is not ready: " + team.validationMessage(),
                        team.teamId(),
                        team.trackId(),
                        null
                ));
            }
            if (team.trackId() == null) {
                items.add(new TeamFormationActionRequiredDto(
                        "TEAM_MISSING_TRACK",
                        closed ? "error" : "warning",
                        team.teamName() + " does not have a track assigned yet.",
                        team.teamId(),
                        null,
                        null
                ));
            }
        }
        for (TeamFormationTrackDto track : tracks) {
            if (track.maxTeams() != null && track.teamCount() >= track.maxTeams()) {
                items.add(new TeamFormationActionRequiredDto(
                        "TRACK_AT_CAPACITY",
                        "info",
                        track.trackName() + " is at maximum capacity (" + track.teamCount() + "/" + track.maxTeams() + " teams).",
                        null,
                        track.trackId(),
                        null
                ));
            }
            if (closed && track.minTeams() != null && track.teamCount() < track.minTeams()) {
                items.add(new TeamFormationActionRequiredDto(
                        "TRACK_BELOW_MINIMUM",
                        "warning",
                        track.trackName() + " has " + track.teamCount() + "/" + track.minTeams() + " minimum teams after the deadline.",
                        null,
                        track.trackId(),
                        null
                ));
            }
        }
        return items;
    }

    private void addMember(TeamEntity team, StudentProfileEntity student) {
        TeamMemberEntity member = new TeamMemberEntity();
        member.setId(new TeamMemberId(team.getTeamId(), student.getUserRoleId()));
        member.setTeam(team);
        member.setStudent(student);
        teamMemberRepository.save(member);
    }

    private void updateTeamMembershipStatus(TeamEntity team, HackathonEventEntity event) {
        long memberCount = teamMemberRepository.countByTeamTeamId(team.getTeamId());
        team.setStatus(memberCount >= minTeamSize(event) && memberCount <= maxTeamSize(event) ? "Ready" : "Forming");
        teamRepository.save(team);
    }

    private void requireTeamHasSlot(TeamEntity team, HackathonEventEntity event) {
        if (teamMemberRepository.countByTeamTeamId(team.getTeamId()) >= maxTeamSize(event)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Team already reached the maximum member limit for this event");
        }
    }

    private boolean trackHasCapacity(TrackEntity track) {
        return track.getMaxTeams() == null || teamRepository.countByTrackTrackId(track.getTrackId()) < track.getMaxTeams();
    }

    private TrackEntity chooseBalancedTrack(List<TrackEntity> availableTracks) {
        Map<Integer, Long> teamCountsByTrackId = availableTracks.stream()
                .collect(Collectors.toMap(
                        TrackEntity::getTrackId,
                        track -> teamRepository.countByTrackTrackId(track.getTrackId()),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        int largestMinimumShortage = availableTracks.stream()
                .mapToInt(track -> Math.max(
                        0,
                        (track.getMinTeams() == null ? 0 : track.getMinTeams())
                                - teamCountsByTrackId.getOrDefault(track.getTrackId(), 0L).intValue()
                ))
                .max()
                .orElse(0);

        List<TrackEntity> prioritizedTracks = largestMinimumShortage > 0
                ? availableTracks.stream()
                .filter(track -> Math.max(
                        0,
                        (track.getMinTeams() == null ? 0 : track.getMinTeams())
                                - teamCountsByTrackId.getOrDefault(track.getTrackId(), 0L).intValue()
                ) == largestMinimumShortage)
                .toList()
                : availableTracks;

        long lowestTeamCount = prioritizedTracks.stream()
                .mapToLong(track -> teamCountsByTrackId.getOrDefault(track.getTrackId(), 0L))
                .min()
                .orElse(0L);

        List<TrackEntity> balancedCandidates = prioritizedTracks.stream()
                .filter(track -> teamCountsByTrackId.getOrDefault(track.getTrackId(), 0L) == lowestTeamCount)
                .toList();

        return balancedCandidates.get(ThreadLocalRandom.current().nextInt(balancedCandidates.size()));
    }

    private void requireTrackCapacity(TrackEntity track) {
        if (!trackHasCapacity(track)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Track already reached its maximum team capacity");
        }
    }

    private int minTeamSize(HackathonEventEntity event) {
        return event.getMinTeamSize() == null ? DEFAULT_MIN_TEAM_SIZE : Math.max(1, event.getMinTeamSize());
    }

    private int maxTeamSize(HackathonEventEntity event) {
        return event.getMaxTeamSize() == null ? DEFAULT_MAX_TEAM_SIZE : Math.max(minTeamSize(event), event.getMaxTeamSize());
    }

    private void requireEventRegistrationAvailable(HackathonEventEntity event) {
        if (EventStatus.from(event.getStatus()) != EventStatus.ONGOING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Registration is open only during Ongoing events");
        }
        LocalDateTime now = LocalDateTime.now();
        if (event.getRegistrationStartAt() == null || event.getRegistrationEndAt() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This event is not ready for registration yet");
        }
        if (now.isBefore(event.getRegistrationStartAt()) || now.isAfter(event.getRegistrationEndAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This event is currently outside its registration window");
        }
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

    private HackathonEventEntity getEventOrThrow(Integer eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    private TeamDto toTeamDto(TeamEntity team, Integer currentUserRoleId) {
        List<TeamMemberDto> members = teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(team.getTeamId())
                .stream()
                .map(member -> toMemberDto(member, team.getLeader().getUserRoleId()))
                .toList();
        HackathonEventEntity event = team.getTrack() == null ? null : getEventOrThrow(team.getTrack().getEventId());
        int minSize = event == null ? DEFAULT_MIN_TEAM_SIZE : minTeamSize(event);
        int maxSize = event == null ? DEFAULT_MAX_TEAM_SIZE : maxTeamSize(event);
        int memberCount = members.size();
        boolean valid = memberCount >= minSize && memberCount <= maxSize;
        String validationMessage = valid
                ? "Team is ready with " + memberCount + " member(s)"
                : "Team needs " + Math.max(0, minSize - memberCount) + " more member(s) before it can compete";
        return new TeamDto(
                team.getTeamId(),
                team.getTeamName(),
                team.getJoinCode(),
                valid ? "Ready" : "Forming",
                team.getTrack() == null ? null : team.getTrack().getTrackId(),
                team.getTrack() == null ? null : team.getTrack().getName(),
                event == null ? null : event.getEventId(),
                event == null ? null : event.getName(),
                team.getLeader().getUserRoleId(),
                team.getLeader().getUserRole().getUser().getFullName(),
                memberCount,
                valid,
                validationMessage,
                currentUserRoleId != null && team.getLeader().getUserRoleId().equals(currentUserRoleId),
                submissionRepository.countByTeamTeamId(team.getTeamId()) == 0,
                team.getCreatedAt(),
                members,
                null,
                null,
                null
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

    private IndividualRegistrationDto toIndividualDto(IndividualRegistrationEntity registration) {
        UserEntity user = registration.getStudent().getUserRole().getUser();
        TeamEntity team = registration.getAssignedTeam();
        return new IndividualRegistrationDto(
                registration.getIndividualRegistrationId(),
                registration.getEvent().getEventId(),
                registration.getEvent().getName(),
                registration.getStudent().getUserRoleId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                registration.getStatus(),
                team == null ? null : team.getTeamId(),
                team == null ? null : team.getTeamName(),
                registration.getCreatedAt(),
                registration.getMatchedAt()
        );
    }

    private String mentorName(TrackMentorEntity item) {
        UserEntity user = item.getMentor().getUserRole().getUser();
        return user.getFullName() == null || user.getFullName().isBlank() ? user.getUsername() : user.getFullName();
    }
}
