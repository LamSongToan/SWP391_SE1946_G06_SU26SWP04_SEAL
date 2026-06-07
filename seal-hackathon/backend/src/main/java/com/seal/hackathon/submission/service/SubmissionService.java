package com.seal.hackathon.submission.service;

import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.submission.dto.SubmissionDto;
import com.seal.hackathon.submission.dto.SubmissionHistoryDto;
import com.seal.hackathon.submission.dto.SubmissionRequest;
import com.seal.hackathon.submission.dto.SubmissionRoundDto;
import com.seal.hackathon.submission.entity.SubmissionEntity;
import com.seal.hackathon.submission.entity.SubmissionHistoryEntity;
import com.seal.hackathon.submission.entity.SubmissionStatus;
import com.seal.hackathon.submission.repository.SubmissionHistoryRepository;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import com.seal.hackathon.team.entity.TeamEntity;
import com.seal.hackathon.team.repository.TeamMemberRepository;
import com.seal.hackathon.team.repository.TeamRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class SubmissionService {

    private static final int MIN_TEAM_SIZE = 3;
    private static final int MAX_TEAM_SIZE = 5;
    private static final String ACTION_CREATED = "CREATED";
    private static final String ACTION_UPDATED = "UPDATED";
    private static final String GITHUB_HOST = "github.com";
    private static final String GITLAB_HOST = "gitlab.com";

    private final SubmissionRepository submissionRepository;
    private final SubmissionHistoryRepository historyRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository memberRepository;
    private final RoundRepository roundRepository;
    private final HackathonEventRepository eventRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;

    public SubmissionService(SubmissionRepository submissionRepository,
                             SubmissionHistoryRepository historyRepository,
                             TeamRepository teamRepository,
                             TeamMemberRepository memberRepository,
                             RoundRepository roundRepository,
                             HackathonEventRepository eventRepository,
                             UserRepository userRepository,
                             StudentProfileRepository studentProfileRepository) {
        this.submissionRepository = submissionRepository;
        this.historyRepository = historyRepository;
        this.teamRepository = teamRepository;
        this.memberRepository = memberRepository;
        this.roundRepository = roundRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    @Transactional(readOnly = true)
    public List<SubmissionDto> listTeamSubmissions(Authentication authentication, Integer teamId) {
        StudentProfileEntity student = currentStudent(authentication);
        TeamEntity team = getTeamOrThrow(teamId);
        requireMember(teamId, student.getUserRoleId());
        return submissionRepository.findByTeamTeamIdOrderByRoundRoundOrderAscSubmittedAtDesc(teamId)
                .stream()
                .map(submission -> toDto(submission, student.getUserRoleId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubmissionRoundDto> listSubmissionRounds(Authentication authentication, Integer teamId) {
        StudentProfileEntity student = currentStudent(authentication);
        TeamEntity team = getTeamOrThrow(teamId);
        requireMember(teamId, student.getUserRoleId());
        HackathonEventEntity event = getEventOrThrow(team.getTrack().getEventId());
        List<SubmissionEntity> submissions = submissionRepository
                .findByTeamTeamIdOrderByRoundRoundOrderAscSubmittedAtDesc(teamId);
        boolean currentUserLeader = team.getLeader().getUserRoleId().equals(student.getUserRoleId());
        long memberCount = memberRepository.countByTeamTeamId(teamId);

        return roundRepository.findByEventIdOrderByRoundOrderAsc(event.getEventId())
                .stream()
                .map(round -> {
                    SubmissionEntity existing = submissions.stream()
                            .filter(submission -> submission.getRound().getRoundId().equals(round.getRoundId()))
                            .findFirst()
                            .orElse(null);
                    String blockedReason = resolveRoundBlockReason(team, event, round, existing, memberCount, currentUserLeader);
                    return new SubmissionRoundDto(
                            round.getRoundId(),
                            round.getRoundName(),
                            round.getRoundOrder(),
                            round.getSubmissionDeadline(),
                            existing == null ? null : existing.getSubmissionId(),
                            existing == null ? null : existing.getStatus(),
                            existing != null,
                            blockedReason == null,
                            blockedReason
                    );
                })
                .toList();
    }

    @Transactional
    public SubmissionDto createSubmission(Authentication authentication,
                                          Integer teamId,
                                          Integer roundId,
                                          SubmissionRequest request) {
        StudentProfileEntity leader = currentStudent(authentication);
        TeamEntity team = getTeamOrThrow(teamId);
        RoundEntity round = getRoundOrThrow(roundId);

        requireLeader(team, leader);
        validateSubmissionRequest(team, round, request);
        submissionRepository.findByTeamTeamIdAndRoundRoundId(teamId, roundId).ifPresent(existing -> {
            throw new ApiException(HttpStatus.CONFLICT, "This team already has a submission for this round");
        });

        SubmissionEntity submission = new SubmissionEntity();
        submission.setTeam(team);
        submission.setRound(round);
        submission.setSubmittedBy(leader);
        submission.setStatus(SubmissionStatus.SUBMITTED.getDbValue());
        applyRequest(submission, request);

        SubmissionEntity saved = submissionRepository.save(submission);
        recordHistory(saved, leader, ACTION_CREATED, null, null, null, null);
        return toDto(saved, leader.getUserRoleId());
    }

    @Transactional
    public SubmissionDto updateSubmission(Authentication authentication,
                                          Integer submissionId,
                                          SubmissionRequest request) {
        StudentProfileEntity leader = currentStudent(authentication);
        SubmissionEntity submission = getSubmissionOrThrow(submissionId);
        requireLeader(submission.getTeam(), leader);
        if (SubmissionStatus.from(submission.getStatus()) != SubmissionStatus.SUBMITTED) {
            throw new ApiException(HttpStatus.CONFLICT, "Only submitted entries can be updated before evaluation starts");
        }

        String oldRepositoryUrl = submission.getRepositoryUrl();
        String oldDemoUrl = submission.getDemoUrl();
        String oldSlideUrl = submission.getSlideUrl();
        String oldStatus = submission.getStatus();

        validateSubmissionRequest(submission.getTeam(), submission.getRound(), request);
        applyRequest(submission, request);
        SubmissionEntity saved = submissionRepository.save(submission);
        recordHistory(saved, leader, ACTION_UPDATED, oldRepositoryUrl, oldDemoUrl, oldSlideUrl, oldStatus);
        return toDto(saved, leader.getUserRoleId());
    }

    @Transactional(readOnly = true)
    public SubmissionDto getSubmission(Authentication authentication, Integer submissionId) {
        StudentProfileEntity student = currentStudent(authentication);
        SubmissionEntity submission = getSubmissionOrThrow(submissionId);
        requireMember(submission.getTeam().getTeamId(), student.getUserRoleId());
        return toDto(submission, student.getUserRoleId());
    }

    @Transactional(readOnly = true)
    public List<SubmissionHistoryDto> getSubmissionHistory(Authentication authentication, Integer submissionId) {
        StudentProfileEntity student = currentStudent(authentication);
        SubmissionEntity submission = getSubmissionOrThrow(submissionId);
        requireMember(submission.getTeam().getTeamId(), student.getUserRoleId());
        return historyRepository.findBySubmissionSubmissionIdOrderByCreatedAtDesc(submissionId)
                .stream()
                .map(this::toHistoryDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubmissionDto> listEventSubmissions(Integer eventId) {
        getEventOrThrow(eventId);
        return submissionRepository.findByEventId(eventId)
                .stream()
                .map(submission -> toDto(submission, null))
                .toList();
    }

    private void validateSubmissionRequest(TeamEntity team,
                                            RoundEntity round,
                                            SubmissionRequest request) {
        validateUrls(request);
        Integer eventId = team.getTrack().getEventId();
        if (!eventId.equals(round.getEventId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Round does not belong to the team's event");
        }

        HackathonEventEntity event = getEventOrThrow(eventId);
        if (EventStatus.from(event.getStatus()) != EventStatus.ONGOING) {
            throw new ApiException(HttpStatus.CONFLICT, "Submissions are open only while the event is Ongoing");
        }

        if (LocalDateTime.now().isAfter(round.getSubmissionDeadline())) {
            throw new ApiException(HttpStatus.CONFLICT, "The submission deadline for this round has passed");
        }

        long memberCount = memberRepository.countByTeamTeamId(team.getTeamId());
        if (memberCount < MIN_TEAM_SIZE || memberCount > MAX_TEAM_SIZE) {
            throw new ApiException(HttpStatus.CONFLICT, "A submission requires a valid team with 3 to 5 members");
        }

        if (round.getRoundOrder() != null && round.getRoundOrder() > 1) {
            RoundEntity previousRound = roundRepository
                    .findByEventIdAndRoundOrder(eventId, round.getRoundOrder() - 1)
                    .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "Previous round is not configured"));
            if (!submissionRepository.existsQualifiedRanking(team.getTeamId(), previousRound.getRoundId())) {
                throw new ApiException(HttpStatus.CONFLICT, "Team is not qualified for this round");
            }
        }
    }

    private String resolveRoundBlockReason(TeamEntity team,
                                           HackathonEventEntity event,
                                           RoundEntity round,
                                           SubmissionEntity existing,
                                           long memberCount,
                                           boolean currentUserLeader) {
        if (!currentUserLeader) {
            return "Only the team leader can submit for this round";
        }
        if (existing != null && SubmissionStatus.from(existing.getStatus()) != SubmissionStatus.SUBMITTED) {
            return "Evaluation has already started for this submission";
        }
        if (EventStatus.from(event.getStatus()) != EventStatus.ONGOING) {
            return "Submissions are open only while the event is Ongoing";
        }
        if (LocalDateTime.now().isAfter(round.getSubmissionDeadline())) {
            return "The submission deadline for this round has passed";
        }
        if (memberCount < MIN_TEAM_SIZE || memberCount > MAX_TEAM_SIZE) {
            return "A submission requires a valid team with 3 to 5 members";
        }
        if (existing == null && round.getRoundOrder() != null && round.getRoundOrder() > 1) {
            return roundRepository.findByEventIdAndRoundOrder(event.getEventId(), round.getRoundOrder() - 1)
                    .filter(previousRound -> submissionRepository.existsQualifiedRanking(team.getTeamId(), previousRound.getRoundId()))
                    .map(previousRound -> (String) null)
                    .orElse("Team is not qualified for this round");
        }
        return null;
    }

    private void validateUrls(SubmissionRequest request) {
        requireRepositoryUrl(request.repositoryUrl());
        validateOptionalHttpUrl(request.demoUrl(), "Demo URL");
        validateOptionalHttpUrl(request.slideUrl(), "Slide URL");
    }

    private void requireRepositoryUrl(String value) {
        String normalized = normalizeRequired(value, "Repository URL");
        if (!isGitRepositoryUrl(normalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Repository URL must be a valid GitHub or GitLab repository URL");
        }
    }

    private void requireHttpUrl(String value, String fieldName) {
        String normalized = normalizeRequired(value, fieldName);
        if (!isHttpUrl(normalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, fieldName + " must be a valid http or https URL");
        }
    }

    private void validateOptionalHttpUrl(String value, String fieldName) {
        String normalized = normalizeOptional(value);
        if (normalized != null && !isHttpUrl(normalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, fieldName + " must be a valid http or https URL");
        }
    }

    private boolean isHttpUrl(String value) {
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            return ("http".equals(scheme) || "https".equals(scheme))
                    && uri.getHost() != null
                    && !uri.getHost().isBlank();
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private boolean isGitRepositoryUrl(String value) {
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!"http".equals(scheme) && !"https".equals(scheme)) {
                return false;
            }

            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (host.startsWith("www.")) {
                host = host.substring(4);
            }
            if (!GITHUB_HOST.equals(host) && !GITLAB_HOST.equals(host)) {
                return false;
            }

            String path = uri.getPath() == null ? "" : uri.getPath();
            String[] segments = path.replaceAll("^/+", "").replaceAll("/+$", "").split("/");
            return segments.length >= 2
                    && !segments[0].isBlank()
                    && !segments[1].isBlank();
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private void applyRequest(SubmissionEntity submission, SubmissionRequest request) {
        submission.setRepositoryUrl(normalizeRequired(request.repositoryUrl(), "Repository URL"));
        submission.setDemoUrl(normalizeOptional(request.demoUrl()));
        submission.setSlideUrl(normalizeOptional(request.slideUrl()));
    }

    private String normalizeRequired(String value, String fieldName) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, fieldName + " is required");
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void recordHistory(SubmissionEntity submission,
                               StudentProfileEntity changedBy,
                               String actionType,
                               String oldRepositoryUrl,
                               String oldDemoUrl,
                               String oldSlideUrl,
                               String oldStatus) {
        SubmissionHistoryEntity history = new SubmissionHistoryEntity();
        history.setSubmission(submission);
        history.setChangedBy(changedBy);
        history.setActionType(actionType);
        history.setOldRepositoryUrl(oldRepositoryUrl);
        history.setNewRepositoryUrl(submission.getRepositoryUrl());
        history.setOldDemoUrl(oldDemoUrl);
        history.setNewDemoUrl(submission.getDemoUrl());
        history.setOldSlideUrl(oldSlideUrl);
        history.setNewSlideUrl(submission.getSlideUrl());
        history.setOldStatus(oldStatus);
        history.setNewStatus(submission.getStatus());
        historyRepository.save(history);
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

    private TeamEntity getTeamOrThrow(Integer teamId) {
        return teamRepository.findDetailedById(teamId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Team not found"));
    }

    private RoundEntity getRoundOrThrow(Integer roundId) {
        return roundRepository.findById(roundId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round not found"));
    }

    private SubmissionEntity getSubmissionOrThrow(Integer submissionId) {
        return submissionRepository.findDetailedById(submissionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Submission not found"));
    }

    private HackathonEventEntity getEventOrThrow(Integer eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    private void requireLeader(TeamEntity team, StudentProfileEntity student) {
        if (!team.getLeader().getUserRoleId().equals(student.getUserRoleId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the team leader can manage submissions");
        }
    }

    private void requireMember(Integer teamId, Integer userRoleId) {
        if (!memberRepository.existsByTeamTeamIdAndStudentUserRoleId(teamId, userRoleId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You are not a member of this team");
        }
    }

    private SubmissionDto toDto(SubmissionEntity submission, Integer currentUserRoleId) {
        TeamEntity team = submission.getTeam();
        RoundEntity round = submission.getRound();
        HackathonEventEntity event = getEventOrThrow(team.getTrack().getEventId());
        boolean currentUserLeader = currentUserRoleId != null
                && team.getLeader().getUserRoleId().equals(currentUserRoleId);
        boolean editable = currentUserLeader
                && SubmissionStatus.from(submission.getStatus()) == SubmissionStatus.SUBMITTED
                && EventStatus.from(event.getStatus()) == EventStatus.ONGOING
                && !LocalDateTime.now().isAfter(round.getSubmissionDeadline());

        StudentProfileEntity submittedBy = submission.getSubmittedBy();
        String submittedByName = submittedBy == null
                ? null
                : submittedBy.getUserRole().getUser().getFullName();

        return new SubmissionDto(
                submission.getSubmissionId(),
                team.getTeamId(),
                team.getTeamName(),
                event.getEventId(),
                event.getName(),
                team.getTrack().getTrackId(),
                team.getTrack().getName(),
                round.getRoundId(),
                round.getRoundName(),
                round.getRoundOrder(),
                round.getSubmissionDeadline(),
                submission.getRepositoryUrl(),
                submission.getDemoUrl(),
                submission.getSlideUrl(),
                submission.getStatus(),
                submission.getSubmittedAt(),
                submission.getUpdatedAt(),
                submittedBy == null ? null : submittedBy.getUserRoleId(),
                submittedByName,
                currentUserLeader,
                editable
        );
    }

    private SubmissionHistoryDto toHistoryDto(SubmissionHistoryEntity history) {
        StudentProfileEntity changedBy = history.getChangedBy();
        String changedByName = changedBy == null
                ? null
                : changedBy.getUserRole().getUser().getFullName();
        return new SubmissionHistoryDto(
                history.getHistoryId(),
                history.getSubmission().getSubmissionId(),
                history.getActionType(),
                changedBy == null ? null : changedBy.getUserRoleId(),
                changedByName,
                history.getOldRepositoryUrl(),
                history.getNewRepositoryUrl(),
                history.getOldDemoUrl(),
                history.getNewDemoUrl(),
                history.getOldSlideUrl(),
                history.getNewSlideUrl(),
                history.getOldStatus(),
                history.getNewStatus(),
                history.getCreatedAt()
        );
    }
}
