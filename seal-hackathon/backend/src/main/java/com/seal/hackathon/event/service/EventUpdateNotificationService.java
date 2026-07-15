package com.seal.hackathon.event.service;

import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.RoleType;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.auth.repository.UserRoleRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.evaluation.dto.TeamAwardHistoryDto;
import com.seal.hackathon.event.dto.AnnouncementRecipientPreviewDto;
import com.seal.hackathon.event.dto.CreateAnnouncementRequest;
import com.seal.hackathon.event.dto.EventUpdateNotificationDto;
import com.seal.hackathon.event.dto.SentAnnouncementDto;
import com.seal.hackathon.event.dto.UpdateAnnouncementRequest;
import com.seal.hackathon.event.entity.AnnouncementEntity;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.EventUpdateNotificationEntity;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.repository.AnnouncementRepository;
import com.seal.hackathon.event.repository.EventUpdateNotificationRepository;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.JudgeAssignmentRepository;
import com.seal.hackathon.event.repository.TrackMentorRepository;
import com.seal.hackathon.evaluation.service.AuditLogService;
import com.seal.hackathon.team.entity.TeamEntity;
import com.seal.hackathon.team.entity.TeamMemberEntity;
import com.seal.hackathon.team.repository.IndividualRegistrationRepository;
import com.seal.hackathon.team.repository.TeamMemberRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class EventUpdateNotificationService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("MMM d, yyyy 'at' hh:mm a", Locale.US);

    private final EventUpdateNotificationRepository notificationRepository;
    private final AnnouncementRepository announcementRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final HackathonEventRepository eventRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final IndividualRegistrationRepository individualRegistrationRepository;
    private final TrackMentorRepository trackMentorRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final AuditLogService auditLogService;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.from:}")
    private String mailFrom;

    @Value("${spring.mail.host:}")
    private String mailHost;

    public EventUpdateNotificationService(EventUpdateNotificationRepository notificationRepository,
                                          AnnouncementRepository announcementRepository,
                                          UserRepository userRepository,
                                          UserRoleRepository userRoleRepository,
                                          HackathonEventRepository eventRepository,
                                          TeamMemberRepository teamMemberRepository,
                                          IndividualRegistrationRepository individualRegistrationRepository,
                                          TrackMentorRepository trackMentorRepository,
                                          JudgeAssignmentRepository judgeAssignmentRepository,
                                          AuditLogService auditLogService,
                                          ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.notificationRepository = notificationRepository;
        this.announcementRepository = announcementRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.eventRepository = eventRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.individualRegistrationRepository = individualRegistrationRepository;
        this.trackMentorRepository = trackMentorRepository;
        this.judgeAssignmentRepository = judgeAssignmentRepository;
        this.auditLogService = auditLogService;
        this.mailSenderProvider = mailSenderProvider;
    }

    @Transactional
    public int notifyEventUpdated(HackathonEventEntity event) {
        if (!isNotifiableEvent(event)) {
            return 0;
        }
        String title = "Event update available";
        String message = "The coordinator updated " + event.getName()
                + ". Please review the latest rounds, promotion rules, deadlines, and scoring updates on your dashboard.";
        return notifyRecipients(
                resolveEventStakeholders(event.getEventId()),
                event,
                title,
                message,
                "EVENT_ROUND_UPDATE",
                LocalDateTime.now(),
                "SEAL Hackathon event updated"
        );
    }

    @Transactional
    public int notifyRegistrationDeadline(HackathonEventEntity event) {
        if (!isNotifiableEvent(event) || event.getRegistrationEndAt() == null) {
            return 0;
        }
        String title = "Registration deadline updated";
        String message = "Registration for " + event.getName()
                + " closes on " + formatDateTime(event.getRegistrationEndAt())
                + ". Please complete your team setup before the deadline.";
        return notifyRecipients(
                resolveRecipients(event.getEventId(), "STUDENTS"),
                event,
                title,
                message,
                "REGISTRATION_DEADLINE",
                LocalDateTime.now(),
                "SEAL Hackathon registration deadline"
        );
    }

    @Transactional
    public int notifyRoundUpdated(HackathonEventEntity event, RoundEntity round) {
        if (!isNotifiableEvent(event) || round == null) {
            return 0;
        }
        String deadlineText = round.getSubmissionDeadline() == null
                ? "No submission deadline configured yet"
                : "Submission deadline: " + formatDateTime(round.getSubmissionDeadline());
        String title = "Round update available";
        String message = round.getRoundName() + " in " + event.getName()
                + " was updated. " + deadlineText + ". Please review the latest round timeline and requirements.";
        return notifyRecipients(
                resolveEventStakeholders(event.getEventId()),
                event,
                title,
                message,
                "EVENT_ROUND_UPDATE",
                LocalDateTime.now(),
                "SEAL Hackathon round updated"
        );
    }

    @Transactional
    public int notifyResultsPublished(HackathonEventEntity event) {
        Set<Integer> recipientIds = resolveRecipients(event.getEventId(), "ALL");
        if (recipientIds.isEmpty()) {
            return 0;
        }

        LocalDateTime createdAt = LocalDateTime.now();
        String title = "Final results published";
        String message = "Final results for " + event.getName()
                + " are now available. Please review rankings, qualification status, awards, and feedback on your dashboard.";

        return notifyRecipients(
                recipientIds,
                event,
                title,
                message,
                "RESULTS",
                createdAt,
                "SEAL Hackathon final results published"
        );
    }

    @Transactional
    public int notifyRoundResultsPublished(HackathonEventEntity event, RoundEntity round) {
        if (event == null || round == null) {
            return 0;
        }
        Set<Integer> recipientIds = resolveRecipients(event.getEventId(), "ALL");
        if (recipientIds.isEmpty()) {
            return 0;
        }

        LocalDateTime createdAt = LocalDateTime.now();
        String title = "Round leaderboard published";
        String message = "Results for " + round.getRoundName()
                + " in " + event.getName()
                + " are now available. Please review rankings, qualification status, and feedback on your dashboard.";

        return notifyRecipients(
                recipientIds,
                event,
                title,
                message,
                "RESULTS",
                createdAt,
                "SEAL Hackathon round leaderboard published"
        );
    }

    @Transactional
    public int notifyAwardsGranted(HackathonEventEntity event, List<TeamAwardHistoryDto> awards) {
        if (event == null || awards == null || awards.isEmpty()) {
            return 0;
        }
        int notificationCount = 0;
        LocalDateTime createdAt = LocalDateTime.now();
        for (TeamAwardHistoryDto award : awards) {
            if (award == null || award.teamId() == null || award.awardName() == null) {
                continue;
            }
            String title = "Award received";
            String message = "Your team " + award.teamName()
                    + " received " + award.awardName()
                    + " in " + event.getName()
                    + " (" + formatPrizeAmount(award.prizeAmountVnd()) + ")"
                    + ". Check the published results for ranking and score details.";
            String subject = "SEAL Hackathon award received";
            for (TeamMemberEntity member : teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(award.teamId())) {
                UserEntity user = member.getStudent().getUserRole().getUser();
                if (user == null) {
                    continue;
                }
                saveNotification(user, event, null, title, message, "AWARD", createdAt);
                sendBestEffortEmail(user, subject, buildEmailBody(user, title, message));
                notificationCount += 1;
            }
        }
        return notificationCount;
    }

    @Transactional
    public void notifyTeamMatched(UserEntity user, HackathonEventEntity event, TeamEntity team) {
        if (user == null || event == null || team == null) {
            return;
        }
        String title = "Team assignment confirmed";
        String message = "You have been assigned to " + team.getTeamName()
                + " for " + event.getName()
                + ". Please check your team workspace for members, track, mentor, and submission details.";
        saveNotification(user, event, null, title, message, "TEAM_MATCHING", LocalDateTime.now());
        sendTeamMatchedEmail(user, event, team);
    }

    @Transactional
    public int notifyTeamIneligible(TeamEntity team,
                                    HackathonEventEntity event,
                                    String validationMessage) {
        if (team == null || event == null) {
            return 0;
        }
        String title = "Team no longer eligible";
        String message = team.getTeamName() + " is currently not eligible for " + event.getName()
                + ". " + normalizeOptionalText(validationMessage, "Please update your team before the next deadline.");
        int notificationCount = 0;
        LocalDateTime createdAt = LocalDateTime.now();
        for (TeamMemberEntity member : teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(team.getTeamId())) {
            UserEntity user = member.getStudent().getUserRole().getUser();
            if (user == null) {
                continue;
            }
            saveNotification(user, event, null, title, message, "TEAM_INELIGIBLE", createdAt);
            sendBestEffortEmail(user, "SEAL Hackathon team eligibility update", buildEmailBody(user, title, message));
            notificationCount += 1;
        }
        return notificationCount;
    }

    @Transactional
    public void notifyCoordinatorRemovedTeamMember(UserEntity coordinator,
                                                   UserEntity removedUser,
                                                   TeamEntity team,
                                                   HackathonEventEntity event,
                                                   String reason) {
        if (coordinator == null || removedUser == null || team == null || event == null) {
            return;
        }

        LocalDateTime createdAt = LocalDateTime.now();
        String coordinatorName = resolveRecipientName(coordinator);
        String removedUserTitle = "Removed from team";
        String removedUserMessage = "Coordinator " + coordinatorName
                + " removed you from " + team.getTeamName()
                + " in " + event.getName()
                + ". Reason: " + normalizeOptionalText(reason, "No reason provided.");
        saveNotification(removedUser, event, null, removedUserTitle, removedUserMessage, "TEAM_MEMBER_REMOVED", createdAt);
        sendBestEffortEmail(
                removedUser,
                "SEAL Hackathon team membership updated",
                buildEmailBody(removedUser, removedUserTitle, removedUserMessage)
        );

        String rosterUpdateTitle = "Team roster updated";
        String rosterUpdateMessage = coordinatorName
                + " removed " + resolveRecipientName(removedUser)
                + " from " + team.getTeamName()
                + ". Reason: " + normalizeOptionalText(reason, "No reason provided.");
        teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(team.getTeamId()).forEach((member) -> {
            UserEntity user = member.getStudent().getUserRole().getUser();
            if (user == null) {
                return;
            }
            saveNotification(user, event, null, rosterUpdateTitle, rosterUpdateMessage, "TEAM_MEMBERSHIP_UPDATE", createdAt);
            sendBestEffortEmail(
                    user,
                    "SEAL Hackathon team roster updated",
                    buildEmailBody(user, rosterUpdateTitle, rosterUpdateMessage)
            );
        });
    }

    @Transactional
    public void notifyCoordinatorAddedTeamMember(UserEntity addedUser,
                                                 TeamEntity team,
                                                 HackathonEventEntity event,
                                                 String reason) {
        if (addedUser == null || team == null || event == null) {
            return;
        }

        LocalDateTime createdAt = LocalDateTime.now();
        String addedUserTitle = "Added to team";
        String addedUserMessage = "Coordinator assigned you to " + team.getTeamName()
                + " in " + event.getName()
                + ". Reason: " + normalizeOptionalText(reason, "Automatic coordinator placement after registration.");
        saveNotification(addedUser, event, null, addedUserTitle, addedUserMessage, "TEAM_MATCHING", createdAt);
        sendBestEffortEmail(
                addedUser,
                "SEAL Hackathon team assignment",
                buildEmailBody(addedUser, addedUserTitle, addedUserMessage)
        );

        String rosterUpdateTitle = "New teammate assigned";
        String rosterUpdateMessage = resolveRecipientName(addedUser)
                + " was added to " + team.getTeamName()
                + " by the coordinator. Reason: "
                + normalizeOptionalText(reason, "Automatic coordinator placement after registration.");
        teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(team.getTeamId()).forEach((member) -> {
            UserEntity user = member.getStudent().getUserRole().getUser();
            if (user == null || user.getUserId() == null || user.getUserId().equals(addedUser.getUserId())) {
                return;
            }
            saveNotification(user, event, null, rosterUpdateTitle, rosterUpdateMessage, "TEAM_MEMBERSHIP_UPDATE", createdAt);
            sendBestEffortEmail(
                    user,
                    "SEAL Hackathon team roster updated",
                    buildEmailBody(user, rosterUpdateTitle, rosterUpdateMessage)
            );
        });
    }

    @Transactional
    public void notifyTeamFormationUnsuccessful(UserEntity user,
                                                HackathonEventEntity event,
                                                String reason) {
        if (user == null || event == null) {
            return;
        }
        String title = "Individual registration could not form a team";
        String message = normalizeOptionalText(
                reason,
                "We could not assign you to a team because there were not enough available members or open teams."
        ) + " You are not eligible to continue in " + event.getName() + ".";
        saveNotification(user, event, null, title, message, "TEAM_MATCHING", LocalDateTime.now());
        sendBestEffortEmail(
                user,
                "SEAL Hackathon individual registration update",
                buildEmailBody(user, title, message)
        );
    }

    @Transactional
    public int notifyTeamTrackChanged(TeamEntity team,
                                      HackathonEventEntity event,
                                      String previousTrackName,
                                      String nextTrackName,
                                      String reason) {
        if (team == null || event == null) {
            return 0;
        }
        String title = "Team track updated";
        String message = team.getTeamName() + " was moved from "
                + normalizeOptionalText(previousTrackName, "an unassigned track")
                + " to " + normalizeOptionalText(nextTrackName, "a new track")
                + " in " + event.getName()
                + ". Reason: " + normalizeOptionalText(reason, "Coordinator track balancing after registration.");
        int notificationCount = 0;
        LocalDateTime createdAt = LocalDateTime.now();
        for (TeamMemberEntity member : teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(team.getTeamId())) {
            UserEntity user = member.getStudent().getUserRole().getUser();
            if (user == null) {
                continue;
            }
            saveNotification(user, event, null, title, message, "EVENT_ROUND_UPDATE", createdAt);
            sendBestEffortEmail(user, "SEAL Hackathon track update", buildEmailBody(user, title, message));
            notificationCount += 1;
        }
        return notificationCount;
    }

    @Transactional
    public int notifyTeamRemovedFromEvent(TeamEntity team,
                                          HackathonEventEntity event,
                                          String previousTrackName,
                                          String reason,
                                          List<UserEntity> mentorRecipients) {
        if (team == null || event == null) {
            return 0;
        }
        int notificationCount = 0;
        LocalDateTime createdAt = LocalDateTime.now();
        String memberTitle = "Your team was disqualified";
        String memberMessage = "Your team " + team.getTeamName()
                + " was disqualified from " + event.getName()
                + " by the coordinator. Reason: " + normalizeOptionalText(reason, "No reason provided.")
                + " Previous track: " + normalizeOptionalText(previousTrackName, "Not assigned")
                + ". Your team is no longer participating in this event, and the team workspace has been reset back to a standalone team.";
        for (TeamMemberEntity member : teamMemberRepository.findByTeamTeamIdOrderByJoinedAtAsc(team.getTeamId())) {
            UserEntity user = member.getStudent().getUserRole().getUser();
            if (user == null) {
                continue;
            }
            saveNotification(user, event, null, memberTitle, memberMessage, "TEAM_DISQUALIFIED", createdAt);
            sendBestEffortEmail(user, "SEAL Hackathon team disqualified", buildEmailBody(user, memberTitle, memberMessage));
            notificationCount += 1;
        }

        String mentorTitle = "Mentored team disqualified";
        String mentorMessage = team.getTeamName()
                + " was disqualified from " + event.getName()
                + ". Track: " + normalizeOptionalText(previousTrackName, "Not assigned")
                + ". Reason: " + normalizeOptionalText(reason, "No reason provided.") + ".";
        for (UserEntity mentor : mentorRecipients == null ? List.<UserEntity>of() : mentorRecipients) {
            if (mentor == null) {
                continue;
            }
            saveNotification(mentor, event, null, mentorTitle, mentorMessage, "TEAM_DISQUALIFIED", createdAt);
            sendBestEffortEmail(mentor, "SEAL Hackathon mentored team disqualified", buildEmailBody(mentor, mentorTitle, mentorMessage));
            notificationCount += 1;
        }
        return notificationCount;
    }

    @Transactional
    public void notifyIndividualTrackUpdated(UserEntity user,
                                             HackathonEventEntity event,
                                             String previousTrackName,
                                             String nextTrackName,
                                             String reason) {
        if (user == null || event == null) {
            return;
        }
        String title = "Preferred track updated";
        String message = "Your registration for " + event.getName()
                + " was moved from " + normalizeOptionalText(previousTrackName, "an unassigned track")
                + " to " + normalizeOptionalText(nextTrackName, "a new track")
                + ". Reason: " + normalizeOptionalText(reason, "Coordinator track balancing after registration.");
        saveNotification(user, event, null, title, message, "EVENT_ROUND_UPDATE", LocalDateTime.now());
        sendBestEffortEmail(user, "SEAL Hackathon registration track update", buildEmailBody(user, title, message));
    }

    @Transactional
    public void notifyIndividualTrackChangeRequest(UserEntity user,
                                                   HackathonEventEntity event,
                                                   String previousTrackName,
                                                   String nextTrackName,
                                                   String reason,
                                                   LocalDateTime responseDueAt) {
        if (user == null || event == null) {
            return;
        }
        String title = "Track change approval needed";
        String message = "Coordinator asked you to move your individual registration for " + event.getName()
                + " from " + normalizeOptionalText(previousTrackName, "your current track")
                + " to " + normalizeOptionalText(nextTrackName, "another track")
                + ". Reason: " + normalizeOptionalText(reason, "Track balancing after registration.")
                + " Please respond before " + formatDateTime(responseDueAt) + ".";
        saveNotification(user, event, null, title, message, "EVENT_ROUND_UPDATE", LocalDateTime.now());
        sendBestEffortEmail(user, "SEAL Hackathon track change approval", buildEmailBody(user, title, message));
    }

    @Transactional
    public int notifyTrackMergeImpact(HackathonEventEntity event,
                                      String sourceTrackName,
                                      String targetTrackName,
                                      String reason) {
        if (event == null) {
            return 0;
        }
        String title = "Track structure updated";
        String message = normalizeOptionalText(sourceTrackName, "One track")
                + " was merged into " + normalizeOptionalText(targetTrackName, "another track")
                + " for " + event.getName()
                + ". Reason: " + normalizeOptionalText(reason, "Coordinator track balancing after registration.");
        return notifyRecipients(
                resolveTrackAssignmentStakeholders(event.getEventId()),
                event,
                title,
                message,
                "EVENT_ROUND_UPDATE",
                LocalDateTime.now(),
                "SEAL Hackathon track structure updated"
        );
    }

    @Transactional
    public int notifyCoordinatorTrackReadinessReminder(HackathonEventEntity event,
                                                       List<String> unresolvedIssues,
                                                       LocalDateTime firstRoundStart,
                                                       int daysRemaining,
                                                       String reminderCategory) {
        if (event == null || unresolvedIssues == null || unresolvedIssues.isEmpty()) {
            return 0;
        }
        String title = daysRemaining <= 1
                ? "Urgent coordinator action required"
                : "Coordinator action required";
        String message = event.getName()
                + " still has unresolved team/track readiness issues before the first round starts on "
                + formatDateTime(firstRoundStart)
                + ". Issue(s): " + String.join("; ", unresolvedIssues)
                + ". Please review and resolve this within "
                + Math.max(1, daysRemaining)
                + " day(s) by rebalancing teams, moving teams, merging/reducing tracks, or cancelling the event.";
        return notifyRecipients(
                resolveCoordinatorRecipients(),
                event,
                title,
                message,
                reminderCategory,
                LocalDateTime.now(),
                "SEAL Hackathon coordinator action required"
        );
    }

    @Transactional
    public int notifyEventStarted(HackathonEventEntity event) {
        if (event == null) {
            return 0;
        }
        Set<Integer> recipientIds = resolveEventStakeholdersAndRegistrants(event.getEventId());
        recipientIds.addAll(resolveCoordinatorRecipients());
        String title = "Event started";
        String message = event.getName()
                + " has started with the final confirmed registration setup. Please open your SEAL dashboard to review your team roster, track assignment, mentors, and upcoming deadlines.";
        return notifyRecipients(
                recipientIds,
                event,
                title,
                message,
                "SYSTEM_EVENT_STARTED",
                LocalDateTime.now(),
                "SEAL Hackathon event started"
        );
    }

    @Transactional
    public int notifyEventCancelled(HackathonEventEntity event, String reason) {
        if (event == null) {
            return 0;
        }
        String title = "Event cancelled";
        String message = event.getName()
                + " has been cancelled by the coordinator. Reason: "
                + normalizeOptionalText(reason, "No reason provided.")
                + " Please stop any further registration, submission, and judging activity for this event.";
        return notifyRecipients(
                resolveEventStakeholdersAndRegistrants(event.getEventId()),
                event,
                title,
                message,
                "EVENT_ROUND_UPDATE",
                LocalDateTime.now(),
                "SEAL Hackathon event cancelled"
        );
    }

    @Transactional
    public int notifyEventAutoCancelled(HackathonEventEntity event, String reason) {
        if (event == null) {
            return 0;
        }
        String title = "Event automatically cancelled";
        String message = event.getName()
                + " was automatically cancelled by the system. Reason: "
                + normalizeOptionalText(reason, "The first round reached its start time before track readiness issues were resolved.")
                + " Please stop any further registration, submission, and judging activity for this event.";
        return notifyRecipients(
                resolveEventStakeholdersAndRegistrants(event.getEventId()),
                event,
                title,
                message,
                "SYSTEM_EVENT_AUTO_CANCELLED",
                LocalDateTime.now(),
                "SEAL Hackathon event automatically cancelled"
        );
    }

    @Transactional
    public int notifyJudgesScoringWindowExtended(HackathonEventEntity event,
                                                 RoundEntity round,
                                                 LocalDateTime newScoringDeadline,
                                                 int extendedDays) {
        if (event == null || round == null) {
            return 0;
        }
        Set<Integer> recipientIds = resolveJudgeRecipientsForRound(round.getRoundId());
        if (recipientIds.isEmpty()) {
            return 0;
        }
        String title = "Scoring deadline extended";
        String message = "The scoring window for " + round.getRoundName()
                + " in " + event.getName()
                + " was extended by " + extendedDays + " day(s). "
                + "Please finalize every assigned submission before "
                + normalizeOptionalText(formatDateTime(newScoringDeadline), "the updated deadline") + ".";
        return notifyRecipients(
                recipientIds,
                event,
                title,
                message,
                "ROUND_SCORING_DEADLINE_EXTENDED",
                LocalDateTime.now(),
                "SEAL Hackathon scoring deadline extended"
        );
    }

    private void sendTeamMatchedEmail(UserEntity user, HackathonEventEntity event, TeamEntity team) {
        if (mailHost == null || mailHost.isBlank() || user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            if (mailFrom != null && !mailFrom.isBlank()) {
                helper.setFrom(mailFrom);
            }
            helper.setTo(user.getEmail());
            helper.setSubject("You have been assigned to a SEAL Hackathon team");
            helper.setText(buildTeamMatchedEmailBody(user, event, team), true);
            mailSender.send(message);
        } catch (MailException | MessagingException ignored) {
            // In-app notification is authoritative; email is best-effort for local/demo environments.
        }
    }

    private String buildTeamMatchedEmailBody(UserEntity user, HackathonEventEntity event, TeamEntity team) {
        String recipientName = user.getFullName() == null || user.getFullName().isBlank()
                ? user.getUsername()
                : user.getFullName().trim();
        String trackName = team.getTrack() == null || team.getTrack().getName() == null
                ? "Track pending"
                : team.getTrack().getName();

        return """
                <div style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#1d2638;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dfe6ef;border-radius:16px;overflow:hidden;">
                    <div style="padding:24px 32px;background:linear-gradient(135deg,#0f766e 0%%,#16a34a 100%%);color:#ffffff;">
                      <div style="font-size:28px;font-weight:800;letter-spacing:0.5px;">SEAL</div>
                      <div style="margin-top:8px;font-size:15px;opacity:0.92;">Team assignment confirmed</div>
                    </div>
                    <div style="padding:32px;">
                      <p style="margin:0 0 12px;font-size:15px;">Hello %s,</p>
                      <p style="margin:0 0 18px;font-size:15px;line-height:1.65;">
                        You have been assigned to <strong>%s</strong> for <strong>%s</strong>.
                      </p>
                      <div style="margin:0 0 18px;padding:18px;border-radius:14px;background:#f0fdf4;border:1px solid #bbf7d0;">
                        <div style="font-size:13px;font-weight:700;color:#15803d;letter-spacing:1.2px;text-transform:uppercase;">Your team</div>
                        <div style="margin-top:10px;font-size:20px;font-weight:800;color:#1d2638;">%s</div>
                        <div style="margin-top:6px;font-size:14px;color:#4f5d75;">Track: %s</div>
                      </div>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#4f5d75;">
                        Please open your SEAL dashboard to check team members, track/mentor details, and submission deadlines.
                      </p>
                    </div>
                    <div style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e5edf5;font-size:12px;color:#637381;">
                      SEAL Hackathon Management System
                    </div>
                  </div>
                </div>
                """.formatted(recipientName, team.getTeamName(), event.getName(), team.getTeamName(), trackName);
    }

    @Transactional
    public SentAnnouncementDto sendAnnouncement(Authentication authentication, CreateAnnouncementRequest request) {
        UserEntity coordinator = currentCoordinator(authentication);
        HackathonEventEntity event = eventRepository.findById(request.eventId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));

        String title = normalizeRequired(request.title(), "Title");
        String message = normalizeRequired(request.message(), "Message");
        String audience = normalizeAudience(request.audience());
        Set<Integer> recipientIds = resolveRecipients(event.getEventId(), audience);

        if (recipientIds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, emptyAudienceMessage(audience));
        }

        LocalDateTime createdAt = LocalDateTime.now();
        AnnouncementEntity announcement = new AnnouncementEntity();
        announcement.setEventId(event.getEventId());
        announcement.setEventName(event.getName());
        announcement.setTitle(title);
        announcement.setMessage(message);
        announcement.setAudience(audience);
        announcement.setRecipientCount(recipientIds.size());
        announcement.setCreatedBy(coordinator);
        announcement.setCreatedAt(createdAt);
        AnnouncementEntity savedAnnouncement = announcementRepository.save(announcement);

        for (Integer userId : recipientIds) {
            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                continue;
            }
            saveNotification(user, event, savedAnnouncement, title, message, audience, createdAt);
            sendBestEffortEmail(
                    user,
                    "SEAL Hackathon announcement",
                    buildEmailBody(user, title, message)
            );
        }
        if (!recipientIds.contains(coordinator.getUserId())) {
            saveNotification(coordinator, event, savedAnnouncement, title, message, "COORDINATOR_COPY", createdAt);
            sendBestEffortEmail(
                    coordinator,
                    "SEAL Hackathon announcement copy",
                    buildEmailBody(coordinator, title, message)
            );
        }

        auditLogService.record(
                coordinator,
                "ANNOUNCEMENT_SENT",
                "EVENT",
                event.getEventId(),
                event.getName(),
                null,
                announcementPayload(title, message, audience, recipientIds.size()),
                "Coordinator sent an announcement"
        );

        return new SentAnnouncementDto(
                savedAnnouncement.getAnnouncementId(),
                event.getEventId(),
                event.getName(),
                title,
                message,
                audience,
                recipientIds.size(),
                createdAt
        );
    }

    @Transactional(readOnly = true)
    public AnnouncementRecipientPreviewDto previewRecipients(Authentication authentication,
                                                             Integer eventId,
                                                             String audience) {
        currentCoordinator(authentication);
        eventRepository.findById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));
        String normalizedAudience = normalizeAudience(audience);
        return new AnnouncementRecipientPreviewDto(
                eventId,
                normalizedAudience,
                resolveRecipients(eventId, normalizedAudience).size()
        );
    }

    @Transactional
    public SentAnnouncementDto updateAnnouncement(Authentication authentication,
                                                  Integer announcementId,
                                                  UpdateAnnouncementRequest request) {
        currentCoordinator(authentication);
        if (announcementId != null && announcementId < 0) {
            return updateLegacyAnnouncement(announcementId, request);
        }

        AnnouncementEntity announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Announcement not found"));
        List<EventUpdateNotificationEntity> group = notificationRepository.findByAnnouncementAnnouncementId(announcementId);
        if (group.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Announcement group not found");
        }

        String title = normalizeRequired(request.title(), "Title");
        String message = normalizeRequired(request.message(), "Message");
        Map<String, Object> oldValue = announcementPayload(
                announcement.getTitle(),
                announcement.getMessage(),
                announcement.getAudience(),
                announcement.getRecipientCount()
        );
        announcement.setTitle(title);
        announcement.setMessage(message);
        announcementRepository.save(announcement);
        group.forEach((notification) -> {
            notification.setTitle(title);
            notification.setMessage(message);
        });
        notificationRepository.saveAll(group);

        auditLogService.record(
                "ANNOUNCEMENT_UPDATED",
                "EVENT",
                announcement.getEventId(),
                announcement.getEventName(),
                oldValue,
                announcementPayload(title, message, announcement.getAudience(), announcement.getRecipientCount()),
                "Coordinator updated an announcement"
        );

        return toSentAnnouncementDto(announcement);
    }

    @Transactional
    public void deleteAnnouncement(Authentication authentication, Integer announcementId) {
        currentCoordinator(authentication);
        if (announcementId != null && announcementId < 0) {
            deleteLegacyAnnouncement(announcementId);
            return;
        }

        AnnouncementEntity announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Announcement not found"));
        List<EventUpdateNotificationEntity> group = notificationRepository.findByAnnouncementAnnouncementId(announcementId);
        if (group.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Announcement group not found");
        }
        auditLogService.record(
                "ANNOUNCEMENT_DELETED",
                "EVENT",
                announcement.getEventId(),
                announcement.getEventName(),
                announcementPayload(
                        announcement.getTitle(),
                        announcement.getMessage(),
                        announcement.getAudience(),
                        announcement.getRecipientCount()
                ),
                null,
                "Coordinator deleted an announcement"
        );
        notificationRepository.deleteAll(group);
        announcementRepository.delete(announcement);
    }

    @Transactional(readOnly = true)
    public List<SentAnnouncementDto> listSentAnnouncements(Authentication authentication) {
        currentCoordinator(authentication);
        List<SentAnnouncementDto> persisted = announcementRepository.findTop300ByOrderByCreatedAtDescAnnouncementIdDesc()
                .stream()
                .map(this::toSentAnnouncementDto)
                .toList();

        Map<String, SentAnnouncementAccumulator> grouped = new LinkedHashMap<>();

        notificationRepository.findTop300ByOrderByCreatedAtDesc().stream()
                .filter((notification) -> notification.getAnnouncement() == null)
                .filter((notification) -> notification.getAnnouncementAudience() != null)
                .filter((notification) -> !notification.getAnnouncementAudience().equalsIgnoreCase("AUTO"))
                .filter((notification) -> !notification.getAnnouncementAudience().equalsIgnoreCase("COORDINATOR_COPY"))
                .forEach((notification) -> {
                    String key = notification.getEventId()
                            + "|" + notification.getTitle()
                            + "|" + notification.getMessage()
                            + "|" + notification.getAnnouncementAudience()
                            + "|" + notification.getCreatedAt();
                    grouped.computeIfAbsent(key, ignored -> new SentAnnouncementAccumulator(notification))
                            .addRecipient(notification.getUser().getUserId());
                });

        List<SentAnnouncementDto> legacy = grouped.values().stream()
                .map(SentAnnouncementAccumulator::toDto)
                .toList();
        return java.util.stream.Stream.concat(persisted.stream(), legacy.stream())
                .sorted((left, right) -> right.createdAt().compareTo(left.createdAt()))
                .limit(300)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EventUpdateNotificationDto> listMyNotifications(Authentication authentication) {
        UserEntity user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return notificationRepository.findTop10ByUserUserIdOrderByCreatedAtDesc(user.getUserId()).stream()
                .map((notification) -> new EventUpdateNotificationDto(
                        notification.getNotificationId(),
                        notification.getEventId(),
                        notification.getEventName(),
                        notification.getTitle(),
                        notification.getMessage(),
                        notification.getAnnouncementAudience(),
                        Boolean.TRUE.equals(notification.getRead()),
                        notification.getReadAt(),
                        notification.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public EventUpdateNotificationDto markNotificationRead(Authentication authentication, Integer notificationId) {
        UserEntity user = currentUser(authentication);
        EventUpdateNotificationEntity notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (notification.getUser() == null || !notification.getUser().getUserId().equals(user.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only update your own notifications");
        }
        if (!Boolean.TRUE.equals(notification.getRead())) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }
        return toNotificationDto(notification);
    }

    @Transactional
    public List<EventUpdateNotificationDto> markAllNotificationsRead(Authentication authentication) {
        UserEntity user = currentUser(authentication);
        List<EventUpdateNotificationEntity> notifications = notificationRepository.findTop10ByUserUserIdOrderByCreatedAtDesc(user.getUserId());
        LocalDateTime now = LocalDateTime.now();
        notifications.stream()
                .filter((notification) -> !Boolean.TRUE.equals(notification.getRead()))
                .forEach((notification) -> {
                    notification.setRead(true);
                    notification.setReadAt(now);
                });
        notificationRepository.saveAll(notifications);
        return notifications.stream()
                .map(this::toNotificationDto)
                .toList();
    }

    private Set<Integer> resolveRecipients(Integer eventId, String audience) {
        Set<Integer> recipientIds = new LinkedHashSet<>();
        if (audience.equals("ALL") || audience.equals("STUDENTS")) {
            recipientIds.addAll(userRoleRepository.findDistinctActiveUserIdsByRoleType(RoleType.STUDENT.getDbValue()));
            recipientIds.addAll(teamMemberRepository.findDistinctStudentUserIdsByEventId(eventId));
        }
        if (audience.equals("ALL") || audience.equals("MENTORS")) {
            recipientIds.addAll(userRoleRepository.findDistinctActiveUserIdsByRoleType(RoleType.MENTOR.getDbValue()));
            recipientIds.addAll(trackMentorRepository.findDistinctMentorUserIdsByEventId(eventId));
        }
        if (audience.equals("ALL") || audience.equals("JUDGES")) {
            recipientIds.addAll(userRoleRepository.findDistinctActiveUserIdsByRoleType(RoleType.JUDGE.getDbValue()));
            recipientIds.addAll(judgeAssignmentRepository.findDistinctJudgeUserIdsByEventId(eventId));
        }
        return recipientIds;
    }

    private Set<Integer> resolveEventStakeholders(Integer eventId) {
        Set<Integer> recipientIds = new LinkedHashSet<>();
        recipientIds.addAll(teamMemberRepository.findDistinctStudentUserIdsByEventId(eventId));
        recipientIds.addAll(trackMentorRepository.findDistinctMentorUserIdsByEventId(eventId));
        recipientIds.addAll(judgeAssignmentRepository.findDistinctJudgeUserIdsByEventId(eventId));
        return recipientIds;
    }

    private Set<Integer> resolveCoordinatorRecipients() {
        return new LinkedHashSet<>(userRoleRepository.findDistinctActiveUserIdsByRoleType(RoleType.COORDINATOR.getDbValue()));
    }

    private Set<Integer> resolveJudgeRecipientsForRound(Integer roundId) {
        if (roundId == null) {
            return Set.of();
        }
        return judgeAssignmentRepository.findByRoundRoundId(roundId).stream()
                .map(item -> item.getJudge().getUserRole().getUser())
                .filter(java.util.Objects::nonNull)
                .map(UserEntity::getUserId)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<Integer> resolveTrackAssignmentStakeholders(Integer eventId) {
        Set<Integer> recipientIds = new LinkedHashSet<>();
        recipientIds.addAll(trackMentorRepository.findDistinctMentorUserIdsByEventId(eventId));
        recipientIds.addAll(judgeAssignmentRepository.findDistinctJudgeUserIdsByEventId(eventId));
        return recipientIds;
    }

    private Set<Integer> resolveEventStakeholdersAndRegistrants(Integer eventId) {
        Set<Integer> recipientIds = resolveEventStakeholders(eventId);
        recipientIds.addAll(individualRegistrationRepository.findDistinctRegisteredStudentUserIdsByEventId(eventId));
        return recipientIds;
    }

    private String emptyAudienceMessage(String audience) {
        if ("STUDENTS".equalsIgnoreCase(audience)) {
            return "No active students found for this event/audience.";
        }
        if ("MENTORS".equalsIgnoreCase(audience)) {
            return "No active mentors found for this event/audience.";
        }
        if ("JUDGES".equalsIgnoreCase(audience)) {
            return "No active judges found for this event/audience.";
        }
        return "No active users found for this event/audience.";
    }

    private EventUpdateNotificationEntity saveNotification(UserEntity user,
                                                           HackathonEventEntity event,
                                                           AnnouncementEntity announcement,
                                                           String title,
                                                           String message,
                                                           String audience,
                                                           LocalDateTime createdAt) {
        EventUpdateNotificationEntity notification = new EventUpdateNotificationEntity();
        notification.setAnnouncement(announcement);
        notification.setUser(user);
        notification.setEventId(event.getEventId());
        notification.setEventName(event.getName());
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setAnnouncementAudience(audience);
        notification.setRead(false);
        notification.setCreatedAt(createdAt);
        return notificationRepository.save(notification);
    }

    private int notifyRecipients(Set<Integer> recipientIds,
                                 HackathonEventEntity event,
                                 String title,
                                 String message,
                                 String category,
                                 LocalDateTime createdAt,
                                 String emailSubject) {
        if (event == null || recipientIds == null || recipientIds.isEmpty()) {
            return 0;
        }
        int savedCount = 0;
        for (Integer userId : recipientIds) {
            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                continue;
            }
            saveNotification(user, event, null, title, message, category, createdAt);
            sendBestEffortEmail(user, emailSubject, buildEmailBody(user, title, message));
            savedCount += 1;
        }
        return savedCount;
    }

    private SentAnnouncementDto updateLegacyAnnouncement(Integer announcementId,
                                                         UpdateAnnouncementRequest request) {
        EventUpdateNotificationEntity representative = findEditableLegacyAnnouncement(announcementId);
        List<EventUpdateNotificationEntity> group = findAnnouncementGroup(representative);
        if (group.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Announcement group not found");
        }

        String title = normalizeRequired(request.title(), "Title");
        String message = normalizeRequired(request.message(), "Message");
        Map<String, Object> oldValue = announcementPayload(
                representative.getTitle(),
                representative.getMessage(),
                representative.getAnnouncementAudience(),
                recipientCount(group)
        );
        group.forEach((notification) -> {
            notification.setTitle(title);
            notification.setMessage(message);
        });
        notificationRepository.saveAll(group);

        auditLogService.record(
                "ANNOUNCEMENT_UPDATED",
                "EVENT",
                representative.getEventId(),
                representative.getEventName(),
                oldValue,
                announcementPayload(title, message, representative.getAnnouncementAudience(), recipientCount(group)),
                "Coordinator updated a legacy announcement"
        );

        return toSentAnnouncementDto(announcementId, representative, group, title, message);
    }

    private void deleteLegacyAnnouncement(Integer announcementId) {
        EventUpdateNotificationEntity representative = findEditableLegacyAnnouncement(announcementId);
        List<EventUpdateNotificationEntity> group = findAnnouncementGroup(representative);
        if (group.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Announcement group not found");
        }
        auditLogService.record(
                "ANNOUNCEMENT_DELETED",
                "EVENT",
                representative.getEventId(),
                representative.getEventName(),
                announcementPayload(
                        representative.getTitle(),
                        representative.getMessage(),
                        representative.getAnnouncementAudience(),
                        recipientCount(group)
                ),
                null,
                "Coordinator deleted a legacy announcement"
        );
        notificationRepository.deleteAll(group);
    }

    private EventUpdateNotificationEntity findEditableLegacyAnnouncement(Integer announcementId) {
        int notificationId = Math.abs(announcementId);
        EventUpdateNotificationEntity notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Announcement not found"));
        String audience = notification.getAnnouncementAudience();
        if (audience == null
                || audience.equalsIgnoreCase("AUTO")
                || audience.equalsIgnoreCase("COORDINATOR_COPY")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only custom sent announcements can be changed");
        }
        return notification;
    }

    private List<EventUpdateNotificationEntity> findAnnouncementGroup(EventUpdateNotificationEntity representative) {
        return notificationRepository.findAnnouncementGroup(
                representative.getEventId(),
                representative.getCreatedAt(),
                representative.getTitle(),
                representative.getMessage(),
                representative.getAnnouncementAudience()
        );
    }

    private SentAnnouncementDto toSentAnnouncementDto(AnnouncementEntity announcement) {
        return new SentAnnouncementDto(
                announcement.getAnnouncementId(),
                announcement.getEventId(),
                announcement.getEventName(),
                announcement.getTitle(),
                announcement.getMessage(),
                announcement.getAudience(),
                announcement.getRecipientCount(),
                announcement.getCreatedAt()
        );
    }

    private SentAnnouncementDto toSentAnnouncementDto(Integer announcementId,
                                                      EventUpdateNotificationEntity representative,
                                                      List<EventUpdateNotificationEntity> group,
                                                      String title,
                                                      String message) {
        return new SentAnnouncementDto(
                announcementId,
                representative.getEventId(),
                representative.getEventName(),
                title,
                message,
                representative.getAnnouncementAudience(),
                recipientCount(group),
                representative.getCreatedAt()
        );
    }

    private Integer recipientCount(List<EventUpdateNotificationEntity> group) {
        Set<Integer> recipientIds = new LinkedHashSet<>();
        group.stream()
                .filter((notification) -> notification.getAnnouncementAudience() != null)
                .filter((notification) -> !notification.getAnnouncementAudience().equalsIgnoreCase("COORDINATOR_COPY"))
                .forEach((notification) -> {
                    if (notification.getUser() != null && notification.getUser().getUserId() != null) {
                        recipientIds.add(notification.getUser().getUserId());
                    }
                });
        return recipientIds.size();
    }

    private Map<String, Object> announcementPayload(String title, String message, String audience, Integer recipientCount) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", title);
        payload.put("message", message);
        payload.put("audience", audience);
        payload.put("recipientCount", recipientCount);
        return payload;
    }

    private EventUpdateNotificationDto toNotificationDto(EventUpdateNotificationEntity notification) {
        return new EventUpdateNotificationDto(
                notification.getNotificationId(),
                notification.getEventId(),
                notification.getEventName(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getAnnouncementAudience(),
                Boolean.TRUE.equals(notification.getRead()),
                notification.getReadAt(),
                notification.getCreatedAt()
        );
    }

    private void sendBestEffortEmail(UserEntity user, String subject, String htmlBody) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        if (mailHost == null || mailHost.isBlank()) {
            return;
        }
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            if (mailFrom != null && !mailFrom.isBlank()) {
                helper.setFrom(mailFrom);
            }
            helper.setTo(user.getEmail());
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
        } catch (MailException | MessagingException ignored) {
            // In-app notification is authoritative; email is best-effort for local/demo environments.
        }
    }

    private String buildEmailBody(UserEntity user, String title, String message) {
        return """
                <div style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#1d2638;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dfe6ef;border-radius:16px;overflow:hidden;">
                    <div style="padding:24px 32px;background:linear-gradient(135deg,#071a2f 0%%,#0d2a47 55%%,#f37021 135%%);color:#ffffff;">
                      <div style="font-size:28px;font-weight:800;letter-spacing:0.5px;">SEAL</div>
                      <div style="margin-top:8px;font-size:15px;opacity:0.92;">%s</div>
                    </div>
                    <div style="padding:32px;">
                      <p style="margin:0 0 12px;font-size:15px;">Hello %s,</p>
                      <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">%s</p>
                    </div>
                    <div style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e5edf5;font-size:12px;color:#637381;">
                      Open your SEAL dashboard for the latest details.
                    </div>
                  </div>
                </div>
                """.formatted(
                title,
                resolveRecipientName(user),
                message
        );
    }

    private String resolveRecipientName(UserEntity user) {
        if (user == null) {
            return "SEAL participant";
        }
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName().trim();
        }
        if (user.getUsername() != null && !user.getUsername().isBlank()) {
            return user.getUsername().trim();
        }
        return user.getEmail() == null || user.getEmail().isBlank() ? "SEAL participant" : user.getEmail().trim();
    }

    private String normalizeOptionalText(String value, String fallback) {
        String normalized = value == null ? "" : value.trim();
        return normalized.isBlank() ? fallback : normalized;
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? "an upcoming update" : value.format(DATE_TIME_FORMATTER);
    }

    private String formatPrizeAmount(Long amountVnd) {
        long safeAmount = amountVnd == null ? 0L : amountVnd;
        return String.format(Locale.US, "%,d VND", safeAmount);
    }

    private boolean isNotifiableEvent(HackathonEventEntity event) {
        if (event == null || event.getEventId() == null) {
            return false;
        }
        try {
            return EventStatus.from(event.getStatus()) != EventStatus.DRAFT;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private UserEntity currentUser(Authentication authentication) {
        if (authentication == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private UserEntity currentCoordinator(Authentication authentication) {
        if (authentication == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        UserEntity user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(user.getUserId(), RoleType.COORDINATOR.getDbValue())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Coordinator role is required"));
        return user;
    }

    private String normalizeRequired(String value, String fieldName) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, fieldName + " is required");
        }
        return normalized;
    }

    private String normalizeAudience(String audience) {
        String normalized = normalizeRequired(audience, "Audience").toUpperCase(Locale.ROOT);
        if (!Set.of("ALL", "STUDENTS", "MENTORS", "JUDGES").contains(normalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Audience must be ALL, STUDENTS, MENTORS, or JUDGES");
        }
        return normalized;
    }

    private static final class SentAnnouncementAccumulator {
        private final Integer eventId;
        private final Integer announcementId;
        private final String eventName;
        private final String title;
        private final String message;
        private final String audience;
        private final LocalDateTime createdAt;
        private final Set<Integer> recipientIds = new LinkedHashSet<>();

        private SentAnnouncementAccumulator(EventUpdateNotificationEntity notification) {
            this.announcementId = -notification.getNotificationId();
            this.eventId = notification.getEventId();
            this.eventName = notification.getEventName();
            this.title = notification.getTitle();
            this.message = notification.getMessage();
            this.audience = notification.getAnnouncementAudience();
            this.createdAt = notification.getCreatedAt();
        }

        private void addRecipient(Integer userId) {
            if (userId != null) {
                recipientIds.add(userId);
            }
        }

        private SentAnnouncementDto toDto() {
            return new SentAnnouncementDto(
                    announcementId,
                    eventId,
                    eventName,
                    title,
                    message,
                    audience,
                    recipientIds.size(),
                    createdAt
            );
        }
    }
}
