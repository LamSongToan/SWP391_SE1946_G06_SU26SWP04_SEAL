package com.seal.hackathon.team.service;

import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.evaluation.repository.FeedbackRepository;
import com.seal.hackathon.evaluation.repository.JudgeEvaluationRepository;
import com.seal.hackathon.evaluation.repository.RankingRepository;
import com.seal.hackathon.evaluation.repository.ScoreRepository;
import com.seal.hackathon.evaluation.repository.ScoreHistoryRepository;
import com.seal.hackathon.evaluation.dto.ManualEliminationRequest;
import com.seal.hackathon.evaluation.service.AuditLogService;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundTrackPromotionRuleEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.entity.JudgeAssignmentEntity;
import com.seal.hackathon.event.entity.TrackMentorEntity;
import com.seal.hackathon.event.repository.EventUpdateNotificationRepository;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.JudgeAssignmentRepository;
import com.seal.hackathon.event.repository.RoundTrackPromotionRuleRepository;
import com.seal.hackathon.event.repository.TrackMentorRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.event.service.EventUpdateNotificationService;
import com.seal.hackathon.submission.entity.SubmissionEntity;
import com.seal.hackathon.submission.repository.SubmissionHistoryRepository;
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
import java.util.Comparator;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class TeamFormationService {

    private static final int DEFAULT_MIN_TEAM_SIZE = 3;
    private static final int DEFAULT_MAX_TEAM_SIZE = 5;
    private static final String STATUS_WAITING = "Waiting";
    private static final String STATUS_MATCHED = "Matched";
    private static final String STATUS_COORDINATOR_REVIEW = "CoordinatorReview";
    private static final String STATUS_TRACK_CHANGE_PENDING = "TrackChangePending";
    private static final String STATUS_UNSUCCESSFUL = "Unsuccessful";
    private static final String EVENT_START_CONFIRMED_CATEGORY = "SYSTEM_EVENT_STARTED";
    private static final String TEAM_STATUS_DISQUALIFIED = "Disqualified";

    private final IndividualRegistrationRepository individualRegistrationRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final HackathonEventRepository eventRepository;
    private final EventUpdateNotificationRepository notificationRepository;
    private final TrackRepository trackRepository;
    private final TrackMentorRepository trackMentorRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final RoundTrackPromotionRuleRepository promotionRuleRepository;
    private final SubmissionRepository submissionRepository;
    private final SubmissionHistoryRepository submissionHistoryRepository;
    private final ScoreRepository scoreRepository;
    private final ScoreHistoryRepository scoreHistoryRepository;
    private final JudgeEvaluationRepository judgeEvaluationRepository;
    private final FeedbackRepository feedbackRepository;
    private final RankingRepository rankingRepository;
    private final AuditLogService auditLogService;
    private final EventUpdateNotificationService notificationService;

    public TeamFormationService(IndividualRegistrationRepository individualRegistrationRepository,
                                TeamRepository teamRepository,
                                TeamMemberRepository teamMemberRepository,
                                StudentProfileRepository studentProfileRepository,
                                UserRepository userRepository,
                                HackathonEventRepository eventRepository,
                                EventUpdateNotificationRepository notificationRepository,
                                TrackRepository trackRepository,
                                TrackMentorRepository trackMentorRepository,
                                JudgeAssignmentRepository judgeAssignmentRepository,
                                RoundTrackPromotionRuleRepository promotionRuleRepository,
                                SubmissionRepository submissionRepository,
                                SubmissionHistoryRepository submissionHistoryRepository,
                                ScoreRepository scoreRepository,
                                ScoreHistoryRepository scoreHistoryRepository,
                                JudgeEvaluationRepository judgeEvaluationRepository,
                                FeedbackRepository feedbackRepository,
                                RankingRepository rankingRepository,
                                AuditLogService auditLogService,
                                EventUpdateNotificationService notificationService) {
        this.individualRegistrationRepository = individualRegistrationRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
        this.eventRepository = eventRepository;
        this.notificationRepository = notificationRepository;
        this.trackRepository = trackRepository;
        this.trackMentorRepository = trackMentorRepository;
        this.judgeAssignmentRepository = judgeAssignmentRepository;
        this.promotionRuleRepository = promotionRuleRepository;
        this.submissionRepository = submissionRepository;
        this.submissionHistoryRepository = submissionHistoryRepository;
        this.scoreRepository = scoreRepository;
        this.scoreHistoryRepository = scoreHistoryRepository;
        this.judgeEvaluationRepository = judgeEvaluationRepository;
        this.feedbackRepository = feedbackRepository;
        this.rankingRepository = rankingRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    @Transactional
    public IndividualRegistrationDto registerIndividual(Authentication authentication, Integer eventId, Integer requestedTrackId) {
        StudentProfileEntity student = currentStudent(authentication);
        HackathonEventEntity event = getEventOrThrow(eventId);
        requireEventRegistrationAvailable(event);
        if (!"TEAM_SELECT".equals(normalizeTrackMode(event))) {
            ensureSystemAssignmentTrackCapacity(event);
        }
        if (teamMemberRepository.existsMembershipInEvent(student.getUserRoleId(), eventId)) {
            throw new ApiException(HttpStatus.CONFLICT, "You already belong to a team in this event");
        }
        if (individualRegistrationRepository.findByEventEventIdAndStudentUserRoleId(eventId, student.getUserRoleId()).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "You already registered individually for this event");
        }
        if (individualRegistrationRepository.existsByEventEventIdAndStudentUserRoleIdAndStatusIgnoreCase(
                eventId, student.getUserRoleId(), STATUS_WAITING)) {
            throw new ApiException(HttpStatus.CONFLICT, "You are already waiting for automatic team matching in this event");
        }

        IndividualRegistrationEntity registration = new IndividualRegistrationEntity();
        registration.setEvent(event);
        registration.setStudent(student);
        registration.setPreferredTrack(resolvePreferredTrack(event, requestedTrackId));
        IndividualRegistrationEntity saved = individualRegistrationRepository.save(registration);
        return individualRegistrationRepository
                .findByEventEventIdAndStudentUserRoleId(eventId, student.getUserRoleId())
                .map(this::toIndividualDto)
                .orElseGet(() -> toIndividualDto(saved));
    }

    @Transactional
    public List<IndividualRegistrationDto> listMyIndividualRegistrations(Authentication authentication) {
        StudentProfileEntity student = currentStudent(authentication);
        List<IndividualRegistrationEntity> registrations = individualRegistrationRepository
                .findByStudentUserRoleIdOrderByCreatedAtDesc(student.getUserRoleId());
        registrations.stream()
                .map(IndividualRegistrationEntity::getEvent)
                .filter(event -> event != null && event.getEventId() != null)
                .collect(Collectors.toMap(
                        HackathonEventEntity::getEventId,
                        event -> event,
                        (left, right) -> left,
                        LinkedHashMap::new
                ))
                .values()
                .forEach(this::resolvePostDeadlineWaitingRegistrations);
        return individualRegistrationRepository
                .findByStudentUserRoleIdOrderByCreatedAtDesc(student.getUserRoleId())
                .stream()
                .map(this::toIndividualDto)
                .toList();
    }

    @Transactional
    public TeamFormationDashboardDto getFormationDashboard(Integer eventId) {
        HackathonEventEntity event = getEventOrThrow(eventId);
        resolvePostDeadlineWaitingRegistrations(event);
        List<TeamEntity> teams = teamRepository.findDetailedByEventId(eventId);
        List<TeamDto> teamDtos = teams.stream()
                .map(team -> toTeamDto(team, null))
                .toList();
        List<IndividualRegistrationDto> waiting = individualRegistrationRepository
                .findByEventEventIdAndStatusInOrderByCreatedAtAsc(
                        eventId,
                        List.of(STATUS_WAITING, STATUS_COORDINATOR_REVIEW, STATUS_TRACK_CHANGE_PENDING)
                )
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
                notificationRepository.existsByEventIdAndAnnouncementAudienceIgnoreCase(event.getEventId(), EVENT_START_CONFIRMED_CATEGORY),
                actionRequired,
                teamDtos,
                waiting,
                tracks
        );
    }

    @Transactional(readOnly = true)
    public TeamFormationDashboardDto getSystemFormationDashboard() {
        List<TeamDto> teamDtos = teamRepository.findAllDetailed().stream()
                .map(team -> toTeamDto(team, null))
                .toList();
        return new TeamFormationDashboardDto(
                null,
                "All Teams",
                "ALL",
                null,
                DEFAULT_MIN_TEAM_SIZE,
                DEFAULT_MAX_TEAM_SIZE,
                null,
                false,
                false,
                List.of(),
                teamDtos,
                List.of(),
                List.of()
        );
    }

    @Transactional
    public List<IndividualRegistrationDto> listIndividualRegistrations(Integer eventId) {
        HackathonEventEntity event = getEventOrThrow(eventId);
        resolvePostDeadlineWaitingRegistrations(event);
        return individualRegistrationRepository.findByEventEventIdOrderByCreatedAtAsc(eventId)
                .stream()
                .map(this::toIndividualDto)
                .toList();
    }

    @Transactional
    public TeamFormationDashboardDto matchWaitingIndividualsNow(Authentication authentication, Integer eventId) {
        UserEntity coordinator = currentCoordinator(authentication);
        HackathonEventEntity event = getEventOrThrow(eventId);
        requireCoordinatorManagedEvent(event);

        List<IndividualRegistrationEntity> waiting = individualRegistrationRepository
                .findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(eventId, STATUS_WAITING);
        int waitingBefore = waiting.size();
        processWaitingRegistrationsAfterDeadline(event, waiting);
        long matchedCount = waiting.stream()
                .filter(registration -> STATUS_MATCHED.equalsIgnoreCase(registration.getStatus()))
                .count();

        auditLogService.record(
                coordinator,
                "INDIVIDUAL_REGISTRATIONS_MATCHED_NOW",
                "EVENT",
                eventId,
                event.getName(),
                Map.of("waitingBefore", waitingBefore),
                Map.of("matchedCount", matchedCount, "waitingAfter", waitingBefore - matchedCount),
                "Coordinator requested immediate matching for the currently eligible individual registrations"
        );
        return getFormationDashboard(eventId);
    }

    @Transactional
    public TeamFormationDashboardDto autoMatchWaitingIndividuals(Integer eventId) {
        HackathonEventEntity event = getEventOrThrow(eventId);
        List<IndividualRegistrationEntity> waiting = individualRegistrationRepository
                .findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(eventId, STATUS_WAITING);
        processWaitingRegistrationsAfterDeadline(event, waiting);
        if (isRegistrationClosed(event)) {
            resolvePostDeadlineWaitingRegistrations(event);
        }
        return getFormationDashboard(eventId);
    }

    @Transactional
    public void processClosedRegistrationLifecycle(Integer eventId) {
        resolvePostDeadlineWaitingRegistrations(getEventOrThrow(eventId));
    }

    @Transactional
    public TeamFormationDashboardDto assignIndividualToTeam(Integer eventId, Integer individualRegistrationId, Integer teamId) {
        HackathonEventEntity event = getEventOrThrow(eventId);
        assignSingleIndividualToTeam(event, individualRegistrationId, teamId);
        return getFormationDashboard(eventId);
    }

    @Transactional
    public TeamFormationDashboardDto removeTeamMember(Authentication authentication,
                                                      Integer eventId,
                                                      Integer teamId,
                                                      Integer userRoleId,
                                                      String reason) {
        UserEntity coordinator = currentCoordinator(authentication);
        HackathonEventEntity event = getEventOrThrow(eventId);
        requireCoordinatorManagedEvent(event);
        TeamEntity team = teamRepository.findDetailedById(teamId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Team not found"));
        if (team.getTrack() == null || !team.getTrack().getEventId().equals(eventId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Team does not belong to this event");
        }

        String normalizedReason = normalizeRequired(reason, "Removal reason");
        TeamMemberId memberId = new TeamMemberId(teamId, userRoleId);
        if (!teamMemberRepository.existsById(memberId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Team member not found");
        }
        if (team.getLeader().getUserRoleId().equals(userRoleId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Transfer team leadership before removing the leader");
        }

        StudentProfileEntity student = studentProfileRepository.findById(userRoleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Student profile not found"));
        UserEntity removedUser = student.getUserRole().getUser();
        String removedUserName = removedUser == null
                ? "Unknown member"
                : (removedUser.getFullName() == null || removedUser.getFullName().isBlank()
                ? removedUser.getUsername()
                : removedUser.getFullName().trim());

        Map<String, Object> oldValue = new LinkedHashMap<>();
        oldValue.put("teamId", teamId);
        oldValue.put("teamName", team.getTeamName());
        oldValue.put("eventId", eventId);
        oldValue.put("eventName", event.getName());
        oldValue.put("removedUserRoleId", userRoleId);
        oldValue.put("removedFullName", removedUserName);
        oldValue.put("removedUsername", removedUser == null ? null : removedUser.getUsername());
        oldValue.put("removedEmail", removedUser == null ? null : removedUser.getEmail());
        oldValue.put("memberCountBefore", teamMemberRepository.countByTeamTeamId(teamId));

        teamMemberRepository.deleteById(memberId);
        updateTeamMembershipStatus(team, event, false);

        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("memberCountAfter", teamMemberRepository.countByTeamTeamId(teamId));
        newValue.put("teamStatus", team.getStatus());

        auditLogService.record(
                coordinator,
                "COORDINATOR_REMOVED_TEAM_MEMBER",
                "TEAM",
                team.getTeamId(),
                team.getTeamName(),
                oldValue,
                newValue,
                normalizedReason
        );
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

    @Transactional
    public TeamFormationDashboardDto requestIndividualTrackChange(Authentication authentication,
                                                                  Integer eventId,
                                                                  Integer individualRegistrationId,
                                                                  Integer targetTrackId,
                                                                  String reason) {
        UserEntity coordinator = currentCoordinator(authentication);
        HackathonEventEntity event = getEventOrThrow(eventId);
        requireCoordinatorManagedEvent(event);
        requireRegistrationClosed(event);

        IndividualRegistrationEntity registration = getIndividualRegistrationForEvent(eventId, individualRegistrationId);
        requireIndividualRegistrationUnresolved(registration);

        TrackEntity targetTrack = trackRepository.findById(targetTrackId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Target track not found"));
        if (!targetTrack.getEventId().equals(eventId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Target track does not belong to this event");
        }

        TrackEntity currentTrack = registration.getPreferredTrack();
        if (currentTrack != null && currentTrack.getTrackId().equals(targetTrackId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Student is already registered for this track");
        }

        String normalizedReason = normalizeRequired(reason, "Track change reason");
        registration.setStatus(STATUS_TRACK_CHANGE_PENDING);
        registration.setStatusReason(normalizedReason);
        registration.setSuggestedTrack(targetTrack);
        registration.setResponseDueAt(resolveIndividualResolutionDeadline(event));
        registration.setRespondedAt(null);
        individualRegistrationRepository.save(registration);

        UserEntity user = registration.getStudent().getUserRole().getUser();
        notificationService.notifyIndividualTrackChangeRequest(
                user,
                event,
                currentTrack == null ? null : currentTrack.getName(),
                targetTrack.getName(),
                normalizedReason,
                registration.getResponseDueAt()
        );
        Map<String, Object> oldValue = new LinkedHashMap<>();
        oldValue.put("eventId", eventId);
        oldValue.put("previousTrackId", currentTrack == null ? null : currentTrack.getTrackId());
        oldValue.put("previousTrackName", currentTrack == null ? null : currentTrack.getName());
        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("targetTrackId", targetTrack.getTrackId());
        newValue.put("targetTrackName", targetTrack.getName());
        newValue.put("responseDueAt", registration.getResponseDueAt());
        auditLogService.record(
                coordinator,
                "INDIVIDUAL_TRACK_CHANGE_REQUESTED",
                "INDIVIDUAL_REGISTRATION",
                registration.getIndividualRegistrationId(),
                user.getFullName(),
                oldValue,
                newValue,
                normalizedReason
        );
        return getFormationDashboard(eventId);
    }

    @Transactional
    public TeamFormationDashboardDto rejectIndividualRegistration(Authentication authentication,
                                                                  Integer eventId,
                                                                  Integer individualRegistrationId,
                                                                  String reason) {
        UserEntity coordinator = currentCoordinator(authentication);
        HackathonEventEntity event = getEventOrThrow(eventId);
        requireCoordinatorManagedEvent(event);

        IndividualRegistrationEntity registration = getIndividualRegistrationForEvent(eventId, individualRegistrationId);
        requireIndividualRegistrationUnresolved(registration);

        String normalizedReason = normalizeRequired(reason, "Rejection reason");
        finalizeIndividualRegistrationAsUnsuccessful(registration, event, normalizedReason, "INDIVIDUAL_REGISTRATION_REJECTED", coordinator);
        return getFormationDashboard(eventId);
    }

    @Transactional
    public IndividualRegistrationDto acceptIndividualTrackChange(Authentication authentication, Integer individualRegistrationId) {
        StudentProfileEntity student = currentStudent(authentication);
        IndividualRegistrationEntity registration = individualRegistrationRepository.findById(individualRegistrationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Individual registration not found"));
        if (!registration.getStudent().getUserRoleId().equals(student.getUserRoleId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only update your own individual registration");
        }
        if (!STATUS_TRACK_CHANGE_PENDING.equalsIgnoreCase(registration.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "There is no pending track change request for this registration");
        }

        HackathonEventEntity event = registration.getEvent();
        expireIndividualRegistrationIfPastDeadline(registration, event);
        if (STATUS_UNSUCCESSFUL.equalsIgnoreCase(registration.getStatus())) {
            return toIndividualDto(registration);
        }

        TrackEntity suggestedTrack = registration.getSuggestedTrack();
        if (suggestedTrack == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "The requested track change is no longer available");
        }

        registration.setPreferredTrack(suggestedTrack);
        registration.setSuggestedTrack(null);
        registration.setStatus(STATUS_WAITING);
        registration.setStatusReason("Student accepted the coordinator track change request.");
        registration.setRespondedAt(LocalDateTime.now());
        registration.setResponseDueAt(resolveIndividualResolutionDeadline(event));
        individualRegistrationRepository.save(registration);

        auditLogService.record(
                "INDIVIDUAL_TRACK_CHANGE_ACCEPTED",
                "INDIVIDUAL_REGISTRATION",
                registration.getIndividualRegistrationId(),
                student.getUserRole().getUser().getFullName(),
                null,
                Map.of(
                        "eventId", event.getEventId(),
                        "preferredTrackId", suggestedTrack.getTrackId(),
                        "preferredTrackName", suggestedTrack.getName()
                ),
                "Student accepted the coordinator track change request"
        );

        resolvePostDeadlineWaitingRegistrations(event);
        return individualRegistrationRepository.findById(individualRegistrationId)
                .map(this::toIndividualDto)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Individual registration not found"));
    }

    @Transactional
    public IndividualRegistrationDto rejectIndividualTrackChange(Authentication authentication, Integer individualRegistrationId) {
        StudentProfileEntity student = currentStudent(authentication);
        IndividualRegistrationEntity registration = individualRegistrationRepository.findById(individualRegistrationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Individual registration not found"));
        if (!registration.getStudent().getUserRoleId().equals(student.getUserRoleId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only update your own individual registration");
        }
        if (!STATUS_TRACK_CHANGE_PENDING.equalsIgnoreCase(registration.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "There is no pending track change request for this registration");
        }

        HackathonEventEntity event = registration.getEvent();
        expireIndividualRegistrationIfPastDeadline(registration, event);
        if (STATUS_UNSUCCESSFUL.equalsIgnoreCase(registration.getStatus())) {
            return toIndividualDto(registration);
        }

        String suggestedTrackName = registration.getSuggestedTrack() == null ? "the requested track" : registration.getSuggestedTrack().getName();
        registration.setStatus(STATUS_COORDINATOR_REVIEW);
        registration.setStatusReason("Student declined the track change request to " + suggestedTrackName + ".");
        registration.setSuggestedTrack(null);
        registration.setRespondedAt(LocalDateTime.now());
        registration.setResponseDueAt(resolveIndividualResolutionDeadline(event));
        individualRegistrationRepository.save(registration);

        auditLogService.record(
                "INDIVIDUAL_TRACK_CHANGE_REJECTED",
                "INDIVIDUAL_REGISTRATION",
                registration.getIndividualRegistrationId(),
                student.getUserRole().getUser().getFullName(),
                null,
                Map.of(
                        "eventId", event.getEventId(),
                        "status", registration.getStatus()
                ),
                "Student rejected the coordinator track change request"
        );
        return toIndividualDto(registration);
    }

    @Transactional
    public TeamFormationDashboardDto disqualifyTeamSubmission(Authentication authentication,
                                                              Integer eventId,
                                                              Integer teamId,
                                                              ManualEliminationRequest request) {
        UserEntity coordinator = currentCoordinator(authentication);
        TeamEntity team = teamRepository.findDetailedById(teamId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Team not found"));
        if (team.getTrack() == null || !team.getTrack().getEventId().equals(eventId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Team does not belong to this event");
        }
        HackathonEventEntity event = getEventOrThrow(eventId);
        if (!"ONGOING".equalsIgnoreCase(String.valueOf(event.getStatus()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only teams in an ongoing event can be disqualified");
        }
        TrackEntity currentTrack = team.getTrack();
        String previousStatus = team.getStatus();
        String previousTrackName = currentTrack == null ? null : currentTrack.getName();
        List<UserEntity> mentorRecipients = currentTrack == null
                ? List.of()
                : trackMentorRepository.findByTrackTrackId(currentTrack.getTrackId()).stream()
                .map(item -> item.getMentor().getUserRole().getUser())
                .filter(java.util.Objects::nonNull)
                .toList();
        List<SubmissionEntity> submissions = submissionRepository.findByTeamTeamIdOrderByRoundRoundOrderAscSubmittedAtDesc(teamId);
        int removedSubmissionCount = purgeTeamCompetitionData(team, event, submissions);
        long memberCount = teamMemberRepository.countByTeamTeamId(team.getTeamId());
        boolean readyWithoutEvent = memberCount >= DEFAULT_MIN_TEAM_SIZE && memberCount <= DEFAULT_MAX_TEAM_SIZE;
        team.setTrack(null);
        team.setStatus(readyWithoutEvent ? "Ready" : "Forming");
        teamRepository.save(team);
        Map<String, Object> oldValue = new LinkedHashMap<>();
        oldValue.put("status", normalizeOptionalText(previousStatus, "Unknown"));
        oldValue.put("eventId", event.getEventId());
        oldValue.put("eventStatus", event.getStatus());
        oldValue.put("trackName", previousTrackName);
        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("status", team.getStatus());
        newValue.put("eventId", null);
        newValue.put("eventStatus", null);
        newValue.put("trackName", null);
        newValue.put("removedSubmissionCount", removedSubmissionCount);
        auditLogService.record(
                coordinator,
                "TEAM_DISQUALIFIED_FROM_EVENT",
                "TEAM",
                team.getTeamId(),
                team.getTeamName(),
                oldValue,
                newValue,
                normalizeOptionalText(request.reason(), "Coordinator disqualified the team from the event")
        );
        notificationService.notifyTeamRemovedFromEvent(
                team,
                event,
                previousTrackName,
                request.reason(),
                mentorRecipients
        );
        return getFormationDashboard(event.getEventId());
    }

    private void assignSingleIndividualToTeam(HackathonEventEntity event, Integer individualRegistrationId, Integer teamId) {
        Integer eventId = event.getEventId();
        requireCoordinatorManagedEvent(event);
        IndividualRegistrationEntity registration = individualRegistrationRepository.findById(individualRegistrationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Individual registration not found"));
        if (!registration.getEvent().getEventId().equals(eventId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Individual registration does not belong to this event");
        }
        if (!STATUS_WAITING.equalsIgnoreCase(registration.getStatus())
                && !STATUS_COORDINATOR_REVIEW.equalsIgnoreCase(registration.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only waiting registrations or registrations under coordinator review can be assigned");
        }
        TeamEntity team = teamRepository.findDetailedById(teamId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Team not found"));
        if (team.getTrack() == null || !team.getTrack().getEventId().equals(eventId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Target team does not belong to this event");
        }
        if (!Boolean.TRUE.equals(team.getAcceptAutoAssignedMembers())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Target team is not accepting coordinator-assigned members");
        }
        requireTeamHasSlot(team, event);
        if (teamMemberRepository.existsMembershipInEvent(registration.getStudent().getUserRoleId(), eventId)) {
            throw new ApiException(HttpStatus.CONFLICT, "Student already belongs to a team in this event");
        }
        if ("TEAM_SELECT".equals(normalizeTrackMode(event))
                && registration.getPreferredTrack() != null
                && !registration.getPreferredTrack().getTrackId().equals(team.getTrack().getTrackId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This student is waiting for a different track");
        }
        addMember(team, registration.getStudent());
        updateTeamMembershipStatus(team, event, false);
        markMatched(registration, team);
        notifyMatched(registration, event, team);
        notificationService.notifyCoordinatorAddedTeamMember(
                registration.getStudent().getUserRole().getUser(),
                team,
                event,
                "Coordinator placed your individual registration into an eligible team."
        );
        auditLogService.record(
                "INDIVIDUAL_ASSIGNED_TO_TEAM",
                "TEAM",
                team.getTeamId(),
                team.getTeamName(),
                null,
                Map.of("eventId", eventId, "individualRegistrationId", individualRegistrationId),
                "Coordinator assigned an individual registration to an existing opted-in team"
        );
    }

    @Transactional
    public TeamFormationDashboardDto assignTeamTrack(Authentication authentication,
                                                     Integer eventId,
                                                     Integer teamId,
                                                     Integer trackId,
                                                     String reason) {
        UserEntity coordinator = currentCoordinator(authentication);
        HackathonEventEntity event = getEventOrThrow(eventId);
        requireCoordinatorManagedEvent(event);
        requireRegistrationClosed(event);

        TeamEntity team = teamRepository.findDetailedById(teamId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Team not found"));
        if (team.getTrack() == null || !team.getTrack().getEventId().equals(eventId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Team does not belong to this event");
        }
        if (submissionRepository.countByTeamTeamId(teamId) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot move a team to another track after it has submitted work");
        }

        TrackEntity targetTrack = trackRepository.findById(trackId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Target track not found"));
        if (!targetTrack.getEventId().equals(eventId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Target track does not belong to this event");
        }
        if (team.getTrack().getTrackId().equals(targetTrack.getTrackId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Team is already assigned to this track");
        }
        requireTrackCapacity(targetTrack);

        String normalizedReason = normalizeRequired(reason, "Track change reason");
        String previousTrackName = team.getTrack().getName();

        Map<String, Object> oldValue = Map.of(
                "teamId", team.getTeamId(),
                "teamName", team.getTeamName(),
                "previousTrackId", team.getTrack().getTrackId(),
                "previousTrackName", previousTrackName,
                "targetTrackId", targetTrack.getTrackId(),
                "targetTrackName", targetTrack.getName()
        );

        team.setTrack(targetTrack);
        teamRepository.save(team);

        Map<String, Object> newValue = Map.of(
                "teamId", team.getTeamId(),
                "teamName", team.getTeamName(),
                "trackId", targetTrack.getTrackId(),
                "trackName", targetTrack.getName()
        );
        auditLogService.record(
                coordinator,
                "TEAM_TRACK_REASSIGNED",
                "TEAM",
                team.getTeamId(),
                team.getTeamName(),
                oldValue,
                newValue,
                normalizedReason
        );
        return getFormationDashboard(eventId);
    }

    @Transactional
    public TeamFormationDashboardDto balanceTracks(Authentication authentication,
                                                   Integer eventId,
                                                   String reason) {
        UserEntity coordinator = currentCoordinator(authentication);
        HackathonEventEntity event = getEventOrThrow(eventId);
        requireCoordinatorManagedEvent(event);
        requireRegistrationClosed(event);

        String normalizedReason = normalizeRequired(reason, "Balance reason");
        int movedCount = rebalanceTrackAssignments(event, normalizedReason);
        auditLogService.record(
                coordinator,
                "TRACKS_BALANCED",
                "EVENT",
                event.getEventId(),
                event.getName(),
                Map.of("eventId", eventId),
                Map.of("movedTeamCount", movedCount),
                normalizedReason
        );
        return getFormationDashboard(eventId);
    }

    @Transactional
    public TeamFormationDashboardDto mergeTracks(Authentication authentication,
                                                 Integer eventId,
                                                 List<Integer> sourceTrackIds,
                                                 String newTrackName,
                                                 String reason) {
        UserEntity coordinator = currentCoordinator(authentication);
        HackathonEventEntity event = getEventOrThrow(eventId);
        requireCoordinatorManagedEvent(event);
        requireRegistrationClosed(event);

        List<Integer> normalizedSourceTrackIds = sourceTrackIds == null
                ? List.of()
                : sourceTrackIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (normalizedSourceTrackIds.size() < 2) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose at least two source tracks to merge");
        }

        String normalizedTrackName = normalizeRequired(newTrackName, "New track name");

        List<TrackEntity> sourceTracks = normalizedSourceTrackIds.stream()
                .map(trackId -> trackRepository.findById(trackId)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Source track not found")))
                .toList();
        if (sourceTracks.stream().anyMatch(track -> !track.getEventId().equals(eventId))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "All source tracks must belong to the selected event");
        }
        if (trackRepository.countByEventId(eventId) < normalizedSourceTrackIds.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Source track selection is invalid");
        }
        reserveTrackNameForMerge(eventId, normalizedTrackName, sourceTracks);

        String normalizedReason = normalizeRequired(reason, "Merge reason");
        List<TeamEntity> sourceTeams = sourceTracks.stream()
                .flatMap(track -> teamRepository.findByTrackTrackIdOrderByTeamNameAsc(track.getTrackId()).stream())
                .toList();

        TeamEntity submittedTeam = sourceTeams.stream()
                .filter(this::hasSubmittedWork)
                .findFirst()
                .orElse(null);
        if (submittedTeam != null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot merge tracks after team " + submittedTeam.getTeamName() + " has already submitted work"
            );
        }

        List<IndividualRegistrationEntity> registrations = individualRegistrationRepository.findByEventEventIdOrderByCreatedAtAsc(eventId);
        Set<Integer> sourceTrackIdSet = new HashSet<>(normalizedSourceTrackIds);
        List<IndividualRegistrationEntity> trackRegistrations = registrations.stream()
                .filter(registration -> belongsToSourceTrack(sourceTrackIdSet, registration.getPreferredTrack())
                        || belongsToSourceTrack(sourceTrackIdSet, registration.getSuggestedTrack()))
                .toList();
        long affectedRegistrationCount = trackRegistrations.stream()
                .filter(registration -> registration.getAssignedTeam() == null)
                .count();

        Integer mergedMinTeams = sourceTracks.stream()
                .map(TrackEntity::getMinTeams)
                .filter(java.util.Objects::nonNull)
                .min(Integer::compareTo)
                .orElse(null);
        Integer mergedMaxTeams = sourceTracks.stream().anyMatch(track -> track.getMaxTeams() == null)
                ? null
                : sourceTracks.stream().map(TrackEntity::getMaxTeams).reduce(0, Integer::sum);

        TrackEntity mergedTrack = new TrackEntity();
        mergedTrack.setEventId(eventId);
        mergedTrack.setName(normalizedTrackName);
        mergedTrack.setMinTeams(mergedMinTeams);
        mergedTrack.setMaxTeams(mergedMaxTeams);
        mergedTrack = trackRepository.save(mergedTrack);

        Map<String, Object> oldValue = new LinkedHashMap<>();
        oldValue.put("sourceTrackIds", normalizedSourceTrackIds);
        oldValue.put("sourceTrackNames", sourceTracks.stream().map(TrackEntity::getName).toList());
        oldValue.put("sourceTeamCount", sourceTeams.size());
        oldValue.put("affectedRegistrationCount", affectedRegistrationCount);

        for (TrackEntity sourceTrack : sourceTracks) {
            migrateTrackMentors(sourceTrack, mergedTrack);
            migrateJudgeAssignments(sourceTrack, mergedTrack);
        }
        migratePromotionRules(sourceTrackIdSet, mergedTrack);

        for (TeamEntity team : sourceTeams) {
            team.setTrack(mergedTrack);
            teamRepository.save(team);
        }

        // Every registration may still reference a source track, including registrations
        // already assigned to a team. Update all FK references before deleting source tracks.
        for (IndividualRegistrationEntity registration : trackRegistrations) {
            if (belongsToSourceTrack(sourceTrackIdSet, registration.getPreferredTrack())) {
                registration.setPreferredTrack(mergedTrack);
            }
            if (belongsToSourceTrack(sourceTrackIdSet, registration.getSuggestedTrack())) {
                registration.setSuggestedTrack(mergedTrack);
            }
            individualRegistrationRepository.save(registration);
        }
        // Ensure FK updates are persisted before source tracks are deleted.
        individualRegistrationRepository.flush();

        for (TrackEntity sourceTrack : sourceTracks) {
            trackRepository.delete(sourceTrack);
        }

        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("mergedTrackId", mergedTrack.getTrackId());
        newValue.put("mergedTrackName", mergedTrack.getName());
        newValue.put("mergedMinTeams", mergedTrack.getMinTeams());
        newValue.put("mergedMaxTeams", mergedTrack.getMaxTeams());
        newValue.put("remainingTrackCount", trackRepository.countByEventId(eventId));

        auditLogService.record(
                coordinator,
                "TRACKS_MERGED_TO_NEW_TRACK",
                "TRACK",
                mergedTrack.getTrackId(),
                mergedTrack.getName(),
                oldValue,
                newValue,
                normalizedReason
        );
        return getFormationDashboard(eventId);
    }

    @Transactional
    public TeamFormationDashboardDto confirmEventStart(Authentication authentication, Integer eventId) {
        UserEntity coordinator = currentCoordinator(authentication);
        return confirmEventStartInternal(eventId, coordinator, false);
    }

    @Transactional
    public TeamFormationDashboardDto confirmEventStartAutomatically(Integer eventId) {
        return confirmEventStartInternal(eventId, null, true);
    }

    private void autoMatchWaitingIndividuals(HackathonEventEntity event) {
        resolvePostDeadlineWaitingRegistrations(event);
    }

    private TeamFormationDashboardDto confirmEventStartInternal(Integer eventId,
                                                                UserEntity coordinator,
                                                                boolean automatic) {
        HackathonEventEntity event = getEventOrThrow(eventId);
        if (!automatic) {
            requireCoordinatorManagedEvent(event);
        }
        requireRegistrationClosed(event);

        if (EventStatus.from(event.getStatus()) != EventStatus.ONGOING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only ongoing events can be started from team management");
        }
        if (notificationRepository.existsByEventIdAndAnnouncementAudienceIgnoreCase(eventId, EVENT_START_CONFIRMED_CATEGORY)) {
            if (automatic) {
                return getFormationDashboard(eventId);
            }
            throw new ApiException(HttpStatus.CONFLICT, "This event has already been started from team management");
        }

        notificationService.notifyEventStarted(event);
        if (automatic) {
            auditLogService.record(
                    "EVENT_START_AUTO_CONFIRMED",
                    "EVENT",
                    event.getEventId(),
                    event.getName(),
                    null,
                    Map.of(
                            "eventId", event.getEventId(),
                            "registrationClosed", true
                    ),
                    "System automatically started the event because the first round began with no unresolved team or track readiness issues"
            );
        } else {
            auditLogService.record(
                    coordinator,
                    "EVENT_START_CONFIRMED",
                    "EVENT",
                    event.getEventId(),
                    event.getName(),
                    null,
                    Map.of(
                            "eventId", event.getEventId(),
                            "registrationClosed", true
                    ),
                    "Coordinator confirmed the final team and track setup and started the event from team management"
            );
        }
        return getFormationDashboard(eventId);
    }

    private void processWaitingRegistrationsAfterDeadline(HackathonEventEntity event,
                                                          List<IndividualRegistrationEntity> waiting) {
        if (waiting.isEmpty()) {
            return;
        }
        int minSize = minTeamSize(event);
        int maxSize = maxTeamSize(event);
        if ("TEAM_SELECT".equals(normalizeTrackMode(event))) {
            createBalancedTeamsByPreferredTrack(event, waiting, minSize, maxSize);
        } else {
            createBalancedTeamsBySystemAssignment(event, waiting, minSize, maxSize);
        }
        autoAssignWaitingIndividualsAfterDeadline(event, waiting);
    }

    private void createBalancedTeamsByPreferredTrack(HackathonEventEntity event,
                                                     List<IndividualRegistrationEntity> waiting,
                                                     int minSize,
                                                     int maxSize) {
        List<TrackEntity> tracks = trackRepository.findByEventIdOrderByTrackIdAsc(event.getEventId());
        for (TrackEntity track : tracks) {
            List<IndividualRegistrationEntity> trackWaiting = waiting.stream()
                    .filter(registration -> STATUS_WAITING.equalsIgnoreCase(registration.getStatus()))
                    .filter(registration -> registration.getPreferredTrack() != null
                            && registration.getPreferredTrack().getTrackId().equals(track.getTrackId()))
                    .collect(Collectors.toCollection(ArrayList::new));
            List<Integer> groupSizes = planBalancedTeamSizes(
                    trackWaiting.size(),
                    minSize,
                    maxSize,
                    remainingTrackSlots(track)
            );
            if (groupSizes.isEmpty()) {
                continue;
            }
            int cursor = 0;
            for (Integer groupSize : groupSizes) {
                List<IndividualRegistrationEntity> group = new ArrayList<>(trackWaiting.subList(cursor, cursor + groupSize));
                cursor += groupSize;
                createAutoMatchedTeam(event, group, track);
            }
        }

        List<IndividualRegistrationEntity> legacyWaiting = waiting.stream()
                .filter(registration -> STATUS_WAITING.equalsIgnoreCase(registration.getStatus()))
                .filter(registration -> registration.getPreferredTrack() == null)
                .collect(Collectors.toCollection(ArrayList::new));
        if (!legacyWaiting.isEmpty()) {
            createBalancedTeamsBySystemAssignment(event, legacyWaiting, minSize, maxSize);
        }
    }

    private void createBalancedTeamsBySystemAssignment(HackathonEventEntity event,
                                                       List<IndividualRegistrationEntity> waiting,
                                                       int minSize,
                                                       int maxSize) {
        List<IndividualRegistrationEntity> unresolved = waiting.stream()
                .filter(registration -> STATUS_WAITING.equalsIgnoreCase(registration.getStatus()))
                .collect(Collectors.toCollection(ArrayList::new));
        List<TrackEntity> availableTracks = trackRepository.findByEventIdOrderByTrackIdAsc(event.getEventId())
                .stream()
                .filter(this::trackHasCapacity)
                .toList();
        if (unresolved.isEmpty() || availableTracks.isEmpty()) {
            return;
        }

        boolean hasUnlimitedTrackCapacity = availableTracks.stream().anyMatch(track -> track.getMaxTeams() == null);
        int maxTeamsToCreate = hasUnlimitedTrackCapacity
                ? Math.max(0, unresolved.size() / minSize)
                : availableTracks.stream().mapToInt(this::remainingTrackSlots).sum();

        List<Integer> groupSizes = planBalancedTeamSizes(
                unresolved.size(),
                minSize,
                maxSize,
                maxTeamsToCreate
        );
        if (groupSizes.isEmpty()) {
            return;
        }

        int cursor = 0;
        for (Integer groupSize : groupSizes) {
            if (cursor + groupSize > unresolved.size()) {
                break;
            }
            List<IndividualRegistrationEntity> group = new ArrayList<>(unresolved.subList(cursor, cursor + groupSize));
            cursor += groupSize;
            createAutoMatchedTeam(event, group, resolveAutoTrackForNewTeam(event));
        }
    }

    private List<Integer> planBalancedTeamSizes(int waitingCount,
                                                int minSize,
                                                int maxSize,
                                                int maxTeamsToCreate) {
        if (waitingCount < minSize || maxTeamsToCreate <= 0) {
            return List.of();
        }

        int cappedMaxTeams = Math.min(maxTeamsToCreate, Math.max(0, waitingCount / minSize));
        int bestAssigned = 0;
        double bestDistanceFromIdeal = Double.MAX_VALUE;
        int bestTeamCount = 0;

        for (int teamCount = 1; teamCount <= cappedMaxTeams; teamCount++) {
            int assigned = Math.min(waitingCount, teamCount * maxSize);
            if (assigned < teamCount * minSize) {
                continue;
            }
            double averageSize = assigned / (double) teamCount;
            double distanceFromIdeal = Math.abs(averageSize - 4.0d);
            if (assigned > bestAssigned
                    || (assigned == bestAssigned && distanceFromIdeal < bestDistanceFromIdeal)
                    || (assigned == bestAssigned && Double.compare(distanceFromIdeal, bestDistanceFromIdeal) == 0 && teamCount < bestTeamCount)) {
                bestAssigned = assigned;
                bestDistanceFromIdeal = distanceFromIdeal;
                bestTeamCount = teamCount;
            }
        }

        if (bestAssigned < minSize || bestTeamCount <= 0) {
            return List.of();
        }

        int baseSize = bestAssigned / bestTeamCount;
        int remainder = bestAssigned % bestTeamCount;
        if (baseSize < minSize || baseSize > maxSize || (remainder > 0 && baseSize + 1 > maxSize)) {
            return List.of();
        }

        List<Integer> sizes = new ArrayList<>(bestTeamCount);
        for (int index = 0; index < bestTeamCount; index++) {
            sizes.add(index < remainder ? baseSize + 1 : baseSize);
        }
        return sizes;
    }

    private void createAutoMatchedTeam(HackathonEventEntity event, List<IndividualRegistrationEntity> group, TrackEntity track) {
        if (group == null || group.isEmpty()) {
            return;
        }
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
                "System formed a balanced team from the currently eligible individual registrations"
        );
    }

    private int remainingTrackSlots(TrackEntity track) {
        if (track == null) {
            return 0;
        }
        if (track.getMaxTeams() == null) {
            return Integer.MAX_VALUE / 4;
        }
        return Math.max(0, track.getMaxTeams() - Math.toIntExact(teamRepository.countByTrackTrackId(track.getTrackId())));
    }

    private TrackEntity resolveAutoTrackForNewTeam(HackathonEventEntity event) {
        List<TrackEntity> tracks = trackRepository.findByEventIdOrderByTrackIdAsc(event.getEventId());
        if (tracks.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This event does not have any tracks configured yet");
        }
        String mode = normalizeTrackMode(event);
        if ("SINGLE_TRACK".equals(mode)) {
            TrackEntity track = tracks.get(0);
            requireTrackCapacity(track);
            return track;
        }
        List<TrackEntity> available = tracks.stream()
                .filter(this::trackHasCapacity)
                .toList();
        if (available.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "All tracks are full. Registration is closed for this event.");
        }
        return chooseBalancedTrack(available);
    }

    private TrackEntity resolvePreferredTrack(HackathonEventEntity event, Integer requestedTrackId) {
        List<TrackEntity> tracks = trackRepository.findByEventIdOrderByTrackIdAsc(event.getEventId());
        if (tracks.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This event does not have any tracks configured yet");
        }

        String mode = normalizeTrackMode(event);
        if ("TEAM_SELECT".equals(mode)) {
            if (requestedTrackId == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a track before registering individually");
            }
            TrackEntity selected = tracks.stream()
                    .filter(track -> track.getTrackId().equals(requestedTrackId))
                    .findFirst()
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Selected track does not belong to this event"));
            requireTrackCapacity(selected);
            return selected;
        }

        if ("SINGLE_TRACK".equals(mode)) {
            TrackEntity sharedTrack = tracks.get(0);
            requireTrackCapacity(sharedTrack);
            return sharedTrack;
        }

        ensureSystemAssignmentTrackCapacity(event);
        return null;
    }

    private String generateAutoTeamName(HackathonEventEntity event) {
        return "Auto Team " + event.getEventId() + "-" + System.currentTimeMillis();
    }

    private void markMatched(IndividualRegistrationEntity registration, TeamEntity team) {
        registration.setAssignedTeam(team);
        registration.setStatus(STATUS_MATCHED);
        registration.setStatusReason(null);
        registration.setSuggestedTrack(null);
        registration.setResponseDueAt(null);
        registration.setMatchedAt(LocalDateTime.now());
        registration.setRespondedAt(null);
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
        boolean closed = isRegistrationClosed(event);
        String trackMode = normalizeTrackMode(event);
        List<IndividualRegistrationDto> coordinatorReview = waiting.stream()
                .filter(item -> STATUS_COORDINATOR_REVIEW.equalsIgnoreCase(item.status()))
                .toList();
        List<IndividualRegistrationDto> trackChangePending = waiting.stream()
                .filter(item -> STATUS_TRACK_CHANGE_PENDING.equalsIgnoreCase(item.status()))
                .toList();
        if (closed) {
            for (IndividualRegistrationDto registration : coordinatorReview) {
                items.add(new TeamFormationActionRequiredDto(
                        "INDIVIDUAL_COORDINATOR_REVIEW",
                        "warning",
                        registration.fullName() + " is still unmatched. "
                                + normalizeOptionalText(
                                registration.statusReason(),
                                "Review this student, request a track change, or reject participation before the event starts."
                        ),
                        null,
                        registration.trackId(),
                        registration.individualRegistrationId()
                ));
            }
            for (IndividualRegistrationDto registration : trackChangePending) {
                items.add(new TeamFormationActionRequiredDto(
                        "INDIVIDUAL_TRACK_CHANGE_PENDING",
                        "info",
                        registration.fullName() + " is waiting for a response to the requested move to "
                                + normalizeOptionalText(registration.suggestedTrackName(), "another track")
                                + " until " + formatDateTime(registration.responseDueAt()) + ".",
                        null,
                        registration.suggestedTrackId(),
                        registration.individualRegistrationId()
                ));
            }
        }
        if (!closed && !"TEAM_SELECT".equals(trackMode) && !tracks.isEmpty()
                && tracks.stream().allMatch(track -> track.maxTeams() != null && track.teamCount() >= track.maxTeams())) {
            items.add(new TeamFormationActionRequiredDto(
                    "REGISTRATION_FULL",
                    "error",
                    "All tracks are full. Close individual registration or increase track capacity before accepting more students.",
                    null,
                    null,
                    null
            ));
        }
        long belowMinimumTrackCount = tracks.stream()
                .filter(track -> track.minTeams() != null && track.teamCount() < track.minTeams())
                .count();
        if (closed && belowMinimumTrackCount > 0) {
            items.add(new TeamFormationActionRequiredDto(
                    "TRACK_CONFIGURATION_REVIEW",
                    "warning",
                    "Some tracks still do not meet the configured minimum team count. Reduce tracks, relax min/max team requirements, or cancel the event if necessary.",
                    null,
                    null,
                    null
            ));
        }
        long minTrackCount = tracks.stream().mapToLong(TeamFormationTrackDto::teamCount).min().orElse(0L);
        long maxTrackCount = tracks.stream().mapToLong(TeamFormationTrackDto::teamCount).max().orElse(0L);
        if (closed && tracks.size() > 1 && maxTrackCount - minTrackCount >= 2) {
            items.add(new TeamFormationActionRequiredDto(
                    "TRACK_REBALANCE_RECOMMENDED",
                    "warning",
                    "Track distribution is uneven after registration closed. Rebalance teams, reduce tracks, or adjust the track min/max configuration.",
                    null,
                    null,
                    null
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
        updateTeamMembershipStatus(team, event, true);
    }

    private void updateTeamMembershipStatus(TeamEntity team,
                                            HackathonEventEntity event,
                                            boolean notifyWhenIneligible) {
        String previousStatus = team.getStatus();
        if (isTeamDisqualified(team)) {
            return;
        }
        long memberCount = teamMemberRepository.countByTeamTeamId(team.getTeamId());
        int minSize = minTeamSize(event);
        int maxSize = maxTeamSize(event);
        boolean valid = memberCount >= minSize && memberCount <= maxSize;
        team.setStatus(valid ? "Ready" : "Forming");
        teamRepository.save(team);
        if (notifyWhenIneligible && "Ready".equalsIgnoreCase(String.valueOf(previousStatus)) && !valid) {
            notificationService.notifyTeamIneligible(
                    team,
                    event,
                    buildMembershipValidationMessage(memberCount, minSize, maxSize)
            );
        }
    }

    private void requireTeamHasSlot(TeamEntity team, HackathonEventEntity event) {
        if (teamMemberRepository.countByTeamTeamId(team.getTeamId()) >= maxTeamSize(event)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Team already reached the maximum member limit for this event");
        }
    }

    private boolean trackHasCapacity(TrackEntity track) {
        return track.getMaxTeams() == null || teamRepository.countByTrackTrackId(track.getTrackId()) < track.getMaxTeams();
    }

    private void ensureSystemAssignmentTrackCapacity(HackathonEventEntity event) {
        boolean hasAvailableTrack = trackRepository.findByEventIdOrderByTrackIdAsc(event.getEventId())
                .stream()
                .anyMatch(this::trackHasCapacity);
        if (!hasAvailableTrack) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "All tracks are full. Registration is closed for this event.");
        }
    }

    private List<TeamEntity> eligibleCoordinatorPlacementTeams(HackathonEventEntity event) {
        if (event == null || event.getEventId() == null) {
            return List.of();
        }
        return teamRepository.findDetailedByEventId(event.getEventId()).stream()
                .filter(team -> Boolean.TRUE.equals(team.getAcceptAutoAssignedMembers()))
                .filter(team -> teamMemberRepository.countByTeamTeamId(team.getTeamId()) < maxTeamSize(event))
                .toList();
    }

    private boolean hasSubmittedWork(TeamEntity team) {
        return team != null && team.getTeamId() != null && submissionRepository.countByTeamTeamId(team.getTeamId()) > 0;
    }

    private int purgeTeamCompetitionData(TeamEntity team,
                                         HackathonEventEntity event,
                                         List<SubmissionEntity> submissions) {
        if (team == null || event == null) {
            return 0;
        }
        List<Integer> submissionIds = submissions == null
                ? List.of()
                : submissions.stream()
                .map(SubmissionEntity::getSubmissionId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (!submissionIds.isEmpty()) {
            feedbackRepository.deleteBySubmissionSubmissionIdIn(submissionIds);
            scoreHistoryRepository.deleteByEvaluationSubmissionSubmissionIdIn(submissionIds);
            scoreRepository.deleteBySubmissionSubmissionIdIn(submissionIds);
            judgeEvaluationRepository.deleteBySubmissionSubmissionIdIn(submissionIds);
            submissionHistoryRepository.deleteBySubmissionSubmissionIdIn(submissionIds);

            // Flush child-table removals first so SQL Server does not reject the
            // parent submission delete while foreign-key rows still exist.
            feedbackRepository.flush();
            scoreHistoryRepository.flush();
            scoreRepository.flush();
            judgeEvaluationRepository.flush();
            submissionHistoryRepository.flush();

            submissionRepository.deleteAllInBatch(submissions);
            submissionRepository.flush();
        }
        rankingRepository.deleteByTeamTeamIdAndRoundEventId(team.getTeamId(), event.getEventId());
        rankingRepository.flush();
        return submissionIds.size();
    }

    private boolean isTeamDisqualified(TeamEntity team) {
        return team != null && TEAM_STATUS_DISQUALIFIED.equalsIgnoreCase(String.valueOf(team.getStatus()));
    }

    private void migratePromotionRules(Set<Integer> sourceTrackIds, TrackEntity targetTrack) {
        List<RoundTrackPromotionRuleEntity> sourceRules = promotionRuleRepository
                .findByTrackIdInOrderByRoundIdAscTrackIdAsc(sourceTrackIds);
        Map<Integer, Integer> mergedTopNByRound = sourceRules.stream()
                .collect(Collectors.toMap(
                        RoundTrackPromotionRuleEntity::getRoundId,
                        RoundTrackPromotionRuleEntity::getTopN,
                        Integer::sum,
                        LinkedHashMap::new
                ));

        sourceTrackIds.forEach(promotionRuleRepository::deleteByTrackId);
        promotionRuleRepository.flush();

        List<RoundTrackPromotionRuleEntity> mergedRules = mergedTopNByRound.entrySet().stream()
                .map(entry -> {
                    RoundTrackPromotionRuleEntity rule = new RoundTrackPromotionRuleEntity();
                    rule.setRoundId(entry.getKey());
                    rule.setTrackId(targetTrack.getTrackId());
                    rule.setTopN(entry.getValue());
                    return rule;
                })
                .toList();
        promotionRuleRepository.saveAll(mergedRules);
        promotionRuleRepository.flush();
    }

    private void migrateTrackMentors(TrackEntity sourceTrack, TrackEntity targetTrack) {
        List<TrackMentorEntity> sourceAssignments = trackMentorRepository.findByTrackTrackId(sourceTrack.getTrackId());
        for (TrackMentorEntity assignment : sourceAssignments) {
            Integer mentorRoleId = assignment.getMentor().getUserRoleId();
            if (trackMentorRepository.existsByTrackTrackIdAndMentorUserRoleId(targetTrack.getTrackId(), mentorRoleId)) {
                trackMentorRepository.delete(assignment);
                continue;
            }
            assignment.setTrack(targetTrack);
            trackMentorRepository.save(assignment);
        }
    }

    private void migrateJudgeAssignments(TrackEntity sourceTrack, TrackEntity targetTrack) {
        List<JudgeAssignmentEntity> sourceAssignments = judgeAssignmentRepository.findByTrackTrackId(sourceTrack.getTrackId());
        for (JudgeAssignmentEntity assignment : sourceAssignments) {
            Integer roundId = assignment.getRound().getRoundId();
            Integer judgeRoleId = assignment.getJudge().getUserRoleId();
            JudgeAssignmentEntity duplicate = judgeAssignmentRepository
                    .findByRoundRoundIdAndTrackTrackIdAndJudgeUserRoleId(roundId, targetTrack.getTrackId(), judgeRoleId)
                    .orElse(null);
            if (duplicate != null) {
                if (hasJudgeAssignmentDependencies(assignment.getJudgeAssignmentId())) {
                    throw new ApiException(
                            HttpStatus.BAD_REQUEST,
                            "Cannot merge tracks because judge " + assignment.getJudge().getUserRole().getUser().getUsername()
                                    + " already has an assignment on " + targetTrack.getName()
                                    + " for round " + assignment.getRound().getRoundName()
                                    + " and the source assignment already contains scoring data."
                    );
                }
                judgeAssignmentRepository.delete(assignment);
                continue;
            }
            assignment.setTrack(targetTrack);
            judgeAssignmentRepository.save(assignment);
        }
    }

    private int rebalanceTrackAssignments(HackathonEventEntity event, String reason) {
        List<TrackEntity> tracks = trackRepository.findByEventIdOrderByTrackIdAsc(event.getEventId());
        if (tracks.size() < 2) {
            return 0;
        }

        int movedCount = 0;
        while (true) {
            TrackEntity sourceTrack = tracks.stream()
                    .max(Comparator.comparingLong((TrackEntity track) -> teamRepository.countByTrackTrackId(track.getTrackId())))
                    .orElse(null);
            TrackEntity targetTrack = tracks.stream()
                    .filter(track -> track.getMaxTeams() == null || teamRepository.countByTrackTrackId(track.getTrackId()) < track.getMaxTeams())
                    .min(Comparator.comparingLong((TrackEntity track) -> teamRepository.countByTrackTrackId(track.getTrackId())))
                    .orElse(null);
            if (sourceTrack == null || targetTrack == null || sourceTrack.getTrackId().equals(targetTrack.getTrackId())) {
                break;
            }

            long sourceCount = teamRepository.countByTrackTrackId(sourceTrack.getTrackId());
            long targetCount = teamRepository.countByTrackTrackId(targetTrack.getTrackId());
            if (sourceCount - targetCount < 2) {
                break;
            }

            TeamEntity movableTeam = teamRepository.findByTrackTrackIdOrderByTeamNameAsc(sourceTrack.getTrackId()).stream()
                    .filter(team -> !hasSubmittedWork(team))
                    .findFirst()
                    .orElse(null);
            if (movableTeam == null) {
                break;
            }

            String previousTrackName = sourceTrack.getName();
            movableTeam.setTrack(targetTrack);
            teamRepository.save(movableTeam);
            movedCount += 1;
            auditLogService.record(
                    "TRACK_BALANCED_TEAM_MOVED",
                    "TEAM",
                    movableTeam.getTeamId(),
                    movableTeam.getTeamName(),
                    Map.of(
                            "eventId", event.getEventId(),
                            "previousTrackId", sourceTrack.getTrackId(),
                            "previousTrackName", previousTrackName,
                            "nextTrackId", targetTrack.getTrackId(),
                            "nextTrackName", targetTrack.getName()
                    ),
                    Map.of("reason", reason),
                    "System-balanced track distribution after registration closed"
            );
        }
        return movedCount;
    }

    private boolean belongsToSourceTrack(Set<Integer> sourceTrackIds, TrackEntity track) {
        return track != null && track.getTrackId() != null && sourceTrackIds.contains(track.getTrackId());
    }

    private void reserveTrackNameForMerge(Integer eventId,
                                          String mergedTrackName,
                                          List<TrackEntity> sourceTracks) {
        List<TrackEntity> conflictingTracks = trackRepository.findByEventIdAndNameIgnoreCase(eventId, mergedTrackName);
        if (conflictingTracks.isEmpty()) {
            return;
        }

        Set<Integer> sourceTrackIds = sourceTracks.stream()
                .map(TrackEntity::getTrackId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        boolean hasNonSourceConflict = conflictingTracks.stream()
                .map(TrackEntity::getTrackId)
                .anyMatch(trackId -> !sourceTrackIds.contains(trackId));
        if (hasNonSourceConflict) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Track name already exists in this event outside the selected merge sources"
            );
        }

        for (TrackEntity track : conflictingTracks) {
            track.setName(buildTemporaryMergedTrackName(track));
            trackRepository.save(track);
        }
    }

    private String buildTemporaryMergedTrackName(TrackEntity track) {
        return "__MERGING_TRACK_" + track.getTrackId() + "__";
    }

    private boolean hasJudgeAssignmentDependencies(Integer judgeAssignmentId) {
        return scoreRepository.existsByJudgeAssignmentJudgeAssignmentId(judgeAssignmentId)
                || judgeEvaluationRepository.existsByJudgeAssignmentJudgeAssignmentId(judgeAssignmentId);
    }

    private List<TeamEntity> eligibleCoordinatorPlacementTeams(HackathonEventEntity event,
                                                               IndividualRegistrationEntity registration) {
        return eligibleCoordinatorPlacementTeams(event).stream()
                .filter(team -> isTrackCompatibleForCoordinatorPlacement(event, registration, team))
                .toList();
    }

    private boolean isTrackCompatibleForCoordinatorPlacement(HackathonEventEntity event,
                                                             IndividualRegistrationEntity registration,
                                                             TeamEntity team) {
        if (team == null || team.getTrack() == null) {
            return false;
        }
        if ("TEAM_SELECT".equals(normalizeTrackMode(event))) {
            return registration.getPreferredTrack() != null
                    && registration.getPreferredTrack().getTrackId().equals(team.getTrack().getTrackId());
        }
        return true;
    }

    private void resolvePostDeadlineWaitingRegistrations(HackathonEventEntity event) {
        if (!isRegistrationClosed(event)) {
            return;
        }
        expireTimedOutIndividualRegistrations(event);
        List<IndividualRegistrationEntity> waiting = individualRegistrationRepository
                .findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(event.getEventId(), STATUS_WAITING);
        if (waiting.isEmpty()) {
            return;
        }
        processWaitingRegistrationsAfterDeadline(event, waiting);
        List<IndividualRegistrationEntity> remainingWaiting = waiting.stream()
                .filter(registration -> STATUS_WAITING.equalsIgnoreCase(registration.getStatus()))
                .toList();
        if (remainingWaiting.isEmpty()) {
            return;
        }
        moveWaitingRegistrationsToCoordinatorReview(event, remainingWaiting);
    }

    private void autoAssignWaitingIndividualsAfterDeadline(HackathonEventEntity event,
                                                           List<IndividualRegistrationEntity> waiting) {
        for (IndividualRegistrationEntity registration : waiting) {
            if (!STATUS_WAITING.equalsIgnoreCase(registration.getStatus())) {
                continue;
            }
            TeamEntity targetTeam = chooseAutoPlacementTeam(event, registration);
            if (targetTeam == null) {
                continue;
            }
            addMember(targetTeam, registration.getStudent());
            updateTeamMembershipStatus(targetTeam, event);
            markMatched(registration, targetTeam);
            notifyMatched(registration, event, targetTeam);
            notificationService.notifyCoordinatorAddedTeamMember(
                    registration.getStudent().getUserRole().getUser(),
                    targetTeam,
                    event,
                    "Automatic placement filled an available opted-in team slot."
            );
            auditLogService.record(
                    "INDIVIDUAL_AUTO_ASSIGNED_TO_EXISTING_TEAM",
                    "TEAM",
                    targetTeam.getTeamId(),
                    targetTeam.getTeamName(),
                    null,
                    Map.of(
                            "eventId", event.getEventId(),
                            "individualRegistrationId", registration.getIndividualRegistrationId(),
                            "userRoleId", registration.getStudent().getUserRoleId()
                    ),
                    "System assigned an eligible individual registration into an opted-in team"
            );
        }
    }

    private void moveWaitingRegistrationsToCoordinatorReview(HackathonEventEntity event,
                                                             List<IndividualRegistrationEntity> registrations) {
        LocalDateTime responseDueAt = resolveIndividualResolutionDeadline(event);
        for (IndividualRegistrationEntity registration : registrations) {
            if (!STATUS_WAITING.equalsIgnoreCase(registration.getStatus())) {
                continue;
            }
            registration.setStatus(STATUS_COORDINATOR_REVIEW);
            registration.setStatusReason(buildUnresolvedPlacementReason(event, registration));
            registration.setResponseDueAt(responseDueAt);
            registration.setSuggestedTrack(null);
            registration.setRespondedAt(null);
            individualRegistrationRepository.save(registration);
        }
    }

    private String buildUnresolvedPlacementReason(HackathonEventEntity event,
                                                  IndividualRegistrationEntity registration) {
        if ("TEAM_SELECT".equals(normalizeTrackMode(event)) && registration.getPreferredTrack() != null) {
            TrackEntity preferredTrack = registration.getPreferredTrack();
            long sameTrackWaitingCount = individualRegistrationRepository
                    .findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(event.getEventId(), STATUS_WAITING)
                    .stream()
                    .filter(item -> item.getPreferredTrack() != null
                            && preferredTrack.getTrackId().equals(item.getPreferredTrack().getTrackId()))
                    .count();
            boolean sameTrackOpenTeam = eligibleCoordinatorPlacementTeams(event, registration).stream().findAny().isPresent();
            boolean otherTrackHasPlacementOption = eligibleCoordinatorPlacementTeams(event).stream()
                    .anyMatch(team -> team.getTrack() != null
                            && !preferredTrack.getTrackId().equals(team.getTrack().getTrackId()));
            if (sameTrackWaitingCount < minTeamSize(event) && !sameTrackOpenTeam) {
                return "Preferred track " + preferredTrack.getName()
                        + " does not have enough unmatched students to form another 3-5 member team, and no open team in that track is accepting extra members."
                        + (otherTrackHasPlacementOption
                        ? " You can request this student to move to another track."
                        : "");
            }
            if (!trackHasCapacity(preferredTrack) && !sameTrackOpenTeam) {
                return "Preferred track " + preferredTrack.getName()
                        + " is already full, and no open team in that track is accepting extra members.";
            }
            return "Preferred track " + preferredTrack.getName()
                    + " still needs coordinator review before this student can be placed.";
        }

        boolean hasOpenPlacementTeam = !eligibleCoordinatorPlacementTeams(event, registration).isEmpty();
        if (!hasOpenPlacementTeam && trackRepository.findByEventIdOrderByTrackIdAsc(event.getEventId()).stream().noneMatch(this::trackHasCapacity)) {
            return "All tracks are already at maximum capacity, and no open team is accepting extra members.";
        }
        return "There were not enough eligible members left to form another balanced 3-5 member team, and automatic placement could not finish this registration.";
    }

    private TeamEntity chooseAutoPlacementTeam(HackathonEventEntity event,
                                               IndividualRegistrationEntity registration) {
        return eligibleCoordinatorPlacementTeams(event, registration).stream()
                .sorted(Comparator
                        .comparingLong((TeamEntity team) -> teamMemberRepository.countByTeamTeamId(team.getTeamId()))
                .thenComparing(TeamEntity::getTeamId, Comparator.nullsLast(Integer::compareTo)))
                .findFirst()
                .orElse(null);
    }

    private void expireTimedOutIndividualRegistrations(HackathonEventEntity event) {
        LocalDateTime now = LocalDateTime.now();
        individualRegistrationRepository.findByEventEventIdAndStatusInOrderByCreatedAtAsc(
                        event.getEventId(),
                        List.of(STATUS_WAITING, STATUS_COORDINATOR_REVIEW, STATUS_TRACK_CHANGE_PENDING)
                )
                .forEach(registration -> {
                    if (registration.getResponseDueAt() == null || now.isBefore(registration.getResponseDueAt())) {
                        return;
                    }
                    String reason = STATUS_TRACK_CHANGE_PENDING.equalsIgnoreCase(registration.getStatus())
                            ? "We could not assign you to a team because the requested track change was not accepted before the deadline."
                            : normalizeOptionalText(
                            registration.getStatusReason(),
                            "We could not assign you to a team because there were not enough available members or open teams."
                    );
                    finalizeIndividualRegistrationAsUnsuccessful(
                            registration,
                            event,
                            reason,
                            "INDIVIDUAL_REGISTRATION_UNSUCCESSFUL",
                            null
                    );
                });
    }

    private void expireIndividualRegistrationIfPastDeadline(IndividualRegistrationEntity registration,
                                                            HackathonEventEntity event) {
        if (registration == null || event == null || registration.getResponseDueAt() == null) {
            return;
        }
        if (!LocalDateTime.now().isBefore(registration.getResponseDueAt())) {
            finalizeIndividualRegistrationAsUnsuccessful(
                    registration,
                    event,
                    "We could not assign you to a team because the response deadline was reached before the registration could be finalized.",
                    "INDIVIDUAL_REGISTRATION_UNSUCCESSFUL",
                    null
            );
        }
    }

    private void finalizeIndividualRegistrationAsUnsuccessful(IndividualRegistrationEntity registration,
                                                              HackathonEventEntity event,
                                                              String reason,
                                                              String auditAction,
                                                              UserEntity actor) {
        if (registration == null || event == null || STATUS_UNSUCCESSFUL.equalsIgnoreCase(registration.getStatus())) {
            return;
        }
        registration.setStatus(STATUS_UNSUCCESSFUL);
        registration.setStatusReason(reason);
        registration.setSuggestedTrack(null);
        registration.setResponseDueAt(null);
        registration.setRespondedAt(registration.getRespondedAt() == null ? LocalDateTime.now() : registration.getRespondedAt());
        registration.setMatchedAt(LocalDateTime.now());
        individualRegistrationRepository.save(registration);

        UserEntity user = registration.getStudent().getUserRole().getUser();
        notificationService.notifyTeamFormationUnsuccessful(user, event, reason);
        if (actor == null) {
            auditLogService.record(
                    auditAction,
                    "INDIVIDUAL_REGISTRATION",
                    registration.getIndividualRegistrationId(),
                    user.getFullName(),
                    null,
                    Map.of("eventId", event.getEventId(), "status", STATUS_UNSUCCESSFUL),
                    reason
            );
            return;
        }
        auditLogService.record(
                actor,
                auditAction,
                "INDIVIDUAL_REGISTRATION",
                registration.getIndividualRegistrationId(),
                user.getFullName(),
                null,
                Map.of("eventId", event.getEventId(), "status", STATUS_UNSUCCESSFUL),
                reason
        );
    }

    private LocalDateTime resolveIndividualResolutionDeadline(HackathonEventEntity event) {
        if (event == null) {
            return null;
        }
        if (event.getCompetitionStartAt() != null) {
            return event.getCompetitionStartAt();
        }
        return event.getRegistrationEndAt() == null
                ? LocalDateTime.now().plusDays(1)
                : event.getRegistrationEndAt().plusDays(1);
    }

    private String buildMembershipValidationMessage(long memberCount, int minSize, int maxSize) {
        if (memberCount < minSize) {
            return "Your team currently has " + memberCount + "/" + minSize
                    + " required members. Add more members before the next deadline.";
        }
        if (memberCount > maxSize) {
            return "Your team currently has " + memberCount + " members, exceeding the maximum of "
                    + maxSize + ". Please adjust the roster.";
        }
        return "Please review your team roster and event registration requirements.";
    }

    private String normalizeTrackMode(HackathonEventEntity event) {
        return event.getTrackSelectionMode() == null
                ? "TEAM_SELECT"
                : event.getTrackSelectionMode().trim().toUpperCase(Locale.ROOT);
    }

    private boolean isRegistrationClosed(HackathonEventEntity event) {
        return event != null
                && event.getRegistrationEndAt() != null
                && LocalDateTime.now().isAfter(event.getRegistrationEndAt());
    }

    private void requireRegistrationClosed(HackathonEventEntity event) {
        if (!isRegistrationClosed(event)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Coordinator assignment of leftover individual registrations is available only after the registration deadline"
            );
        }
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

    private UserEntity currentCoordinator(Authentication authentication) {
        if (authentication == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private HackathonEventEntity getEventOrThrow(Integer eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    private void requireCoordinatorManagedEvent(HackathonEventEntity event) {
        if (EventStatus.from(event.getStatus()) != EventStatus.ONGOING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Coordinator team changes are allowed only while the event is ongoing");
        }
    }

    private String normalizeRequired(String value, String fieldName) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, fieldName + " is required");
        }
        return normalized;
    }

    private String normalizeOptionalText(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? "the resolution deadline" : value.toString();
    }

    private IndividualRegistrationEntity getIndividualRegistrationForEvent(Integer eventId, Integer individualRegistrationId) {
        IndividualRegistrationEntity registration = individualRegistrationRepository.findById(individualRegistrationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Individual registration not found"));
        if (!registration.getEvent().getEventId().equals(eventId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Individual registration does not belong to this event");
        }
        return registration;
    }

    private void requireIndividualRegistrationUnresolved(IndividualRegistrationEntity registration) {
        if (registration == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Individual registration not found");
        }
        String status = registration.getStatus();
        if (STATUS_MATCHED.equalsIgnoreCase(status) || STATUS_UNSUCCESSFUL.equalsIgnoreCase(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This individual registration has already been finalized");
        }
    }

    private TeamDto toTeamDto(TeamEntity team, Integer currentUserRoleId) {
        List<TeamMemberDto> members = teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(team.getTeamId())
                .stream()
                .map(member -> toMemberDto(member, team.getLeader().getUserRoleId()))
                .toList();
        HackathonEventEntity event = team.getTrack() == null ? null : getEventOrThrow(team.getTrack().getEventId());
        String mentorNames = team.getTrack() == null
                ? "No mentor assigned"
                : trackMentorRepository.findByTrackTrackId(team.getTrack().getTrackId()).stream()
                .map(this::mentorName)
                .collect(Collectors.joining(", "));
        SubmissionEntity latestSubmission = event == null ? null : resolveLatestSubmission(team.getTeamId()).orElse(null);
        int minSize = event == null ? DEFAULT_MIN_TEAM_SIZE : minTeamSize(event);
        int maxSize = event == null ? DEFAULT_MAX_TEAM_SIZE : maxTeamSize(event);
        int memberCount = members.size();
        boolean valid = memberCount >= minSize && memberCount <= maxSize;
        boolean disqualified = isTeamDisqualified(team);
        String validationMessage = disqualified
                ? "Team has been disqualified from this event"
                : valid
                ? "Team is ready with " + memberCount + " member(s)"
                : "Team needs " + Math.max(0, minSize - memberCount) + " more member(s) before it can compete";
        return new TeamDto(
                team.getTeamId(),
                team.getTeamName(),
                team.getJoinCode(),
                disqualified ? TEAM_STATUS_DISQUALIFIED : valid ? "Ready" : "Forming",
                team.getTrack() == null ? null : team.getTrack().getTrackId(),
                team.getTrack() == null ? null : team.getTrack().getName(),
                event == null ? null : event.getEventId(),
                event == null ? null : event.getName(),
                event == null ? null : event.getStatus(),
                mentorNames.isBlank() ? "No mentor assigned" : mentorNames,
                team.getLeader().getUserRoleId(),
                team.getLeader().getUserRole().getUser().getFullName(),
                memberCount,
                valid,
                validationMessage,
                currentUserRoleId != null && team.getLeader().getUserRoleId().equals(currentUserRoleId),
                Boolean.TRUE.equals(team.getAcceptAutoAssignedMembers()),
                canEditAutoAssignedPreference(team),
                submissionRepository.countByTeamTeamId(team.getTeamId()) == 0,
                team.getCreatedAt(),
                members,
                latestSubmission == null ? null : latestSubmission.getSubmissionId(),
                latestSubmission == null ? null : latestSubmission.getRound().getRoundId(),
                latestSubmission == null ? (disqualified ? TEAM_STATUS_DISQUALIFIED : null) : latestSubmission.getStatus(),
                latestSubmission == null ? null : latestSubmission.getRound().getRoundName(),
                latestSubmission == null ? null : latestSubmission.getRound().getSubmissionDeadline()
        );
    }

    private java.util.Optional<SubmissionEntity> resolveLatestSubmission(Integer teamId) {
        return submissionRepository.findByTeamTeamIdOrderByRoundRoundOrderAscSubmittedAtDesc(teamId)
                .stream()
                .max(Comparator
                        .comparing((SubmissionEntity item) -> item.getRound().getRoundOrder(), Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(SubmissionEntity::getSubmittedAt, Comparator.nullsLast(LocalDateTime::compareTo))
                        .thenComparing(SubmissionEntity::getSubmissionId, Comparator.nullsLast(Integer::compareTo)));
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
        TrackEntity track = team != null ? team.getTrack() : registration.getPreferredTrack();
        return new IndividualRegistrationDto(
                registration.getIndividualRegistrationId(),
                registration.getEvent().getEventId(),
                registration.getEvent().getName(),
                track == null ? null : track.getTrackId(),
                track == null ? null : track.getName(),
                registration.getSuggestedTrack() == null ? null : registration.getSuggestedTrack().getTrackId(),
                registration.getSuggestedTrack() == null ? null : registration.getSuggestedTrack().getName(),
                registration.getStudent().getUserRoleId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                registration.getStatus(),
                registration.getStatusReason(),
                team == null ? null : team.getTeamId(),
                team == null ? null : team.getTeamName(),
                registration.getCreatedAt(),
                registration.getMatchedAt(),
                registration.getResponseDueAt(),
                registration.getRespondedAt()
        );
    }

    private String mentorName(TrackMentorEntity item) {
        UserEntity user = item.getMentor().getUserRole().getUser();
        return user.getFullName() == null || user.getFullName().isBlank() ? user.getUsername() : user.getFullName();
    }

    private boolean canEditAutoAssignedPreference(TeamEntity team) {
        if (team == null || team.getTrack() == null) {
            return true;
        }
        HackathonEventEntity registeredEvent = getEventOrThrow(team.getTrack().getEventId());
        return registeredEvent.getRegistrationEndAt() == null
                || !LocalDateTime.now().isAfter(registeredEvent.getRegistrationEndAt());
    }
}
