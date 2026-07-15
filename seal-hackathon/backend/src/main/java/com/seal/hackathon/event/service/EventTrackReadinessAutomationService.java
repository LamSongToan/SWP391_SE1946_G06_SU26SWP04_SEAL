package com.seal.hackathon.event.service;

import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.repository.EventUpdateNotificationRepository;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.team.dto.TeamFormationActionRequiredDto;
import com.seal.hackathon.team.dto.TeamFormationDashboardDto;
import com.seal.hackathon.team.service.TeamFormationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class EventTrackReadinessAutomationService {

    private static final String REMINDER_TWO_DAYS_CATEGORY = "SYSTEM_TRACK_REVIEW_REMINDER_2D";
    private static final String REMINDER_ONE_DAY_CATEGORY = "SYSTEM_TRACK_REVIEW_REMINDER_1D";
    private static final String EVENT_START_CONFIRMED_CATEGORY = "SYSTEM_EVENT_STARTED";

    private final HackathonEventRepository eventRepository;
    private final RoundRepository roundRepository;
    private final EventUpdateNotificationRepository notificationRepository;
    private final EventUpdateNotificationService notificationService;
    private final EventManagementService eventManagementService;
    private final TeamFormationService teamFormationService;

    public EventTrackReadinessAutomationService(HackathonEventRepository eventRepository,
                                                RoundRepository roundRepository,
                                                EventUpdateNotificationRepository notificationRepository,
                                                EventUpdateNotificationService notificationService,
                                                EventManagementService eventManagementService,
                                                TeamFormationService teamFormationService) {
        this.eventRepository = eventRepository;
        this.roundRepository = roundRepository;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
        this.eventManagementService = eventManagementService;
        this.teamFormationService = teamFormationService;
    }

    @Scheduled(fixedRate = 3_600_000)
    @Transactional
    public void processTrackReadinessDeadlines() {
        LocalDateTime now = LocalDateTime.now();
        for (HackathonEventEntity event : eventRepository.findUpcomingEvents(LocalDate.now())) {
            handleEvent(event, now);
        }
    }

    void handleEvent(HackathonEventEntity event, LocalDateTime now) {
        if (event == null
                || event.getEventId() == null
                || !isRegistrationClosed(event, now)
                || isEventStartConfirmed(event.getEventId())) {
            return;
        }

        LocalDateTime firstRoundStart = resolveFirstRoundStart(event);
        if (firstRoundStart == null) {
            return;
        }

        TeamFormationDashboardDto dashboard = teamFormationService.getFormationDashboard(event.getEventId());
        List<String> unresolvedIssues = extractBlockingIssues(dashboard);

        if (unresolvedIssues.isEmpty()) {
            if (!now.isBefore(firstRoundStart)) {
                teamFormationService.confirmEventStartAutomatically(event.getEventId());
            }
            return;
        }

        if (!now.isBefore(firstRoundStart)) {
            String reason = buildAutoCancelReason(firstRoundStart, unresolvedIssues);
            eventManagementService.cancelEventAutomatically(event.getEventId(), reason);
            return;
        }

        if (!now.isBefore(firstRoundStart.minusDays(1))) {
            sendReminderIfNeeded(event, unresolvedIssues, firstRoundStart, 1, REMINDER_ONE_DAY_CATEGORY);
            return;
        }

        if (!now.isBefore(firstRoundStart.minusDays(2))) {
            sendReminderIfNeeded(event, unresolvedIssues, firstRoundStart, 2, REMINDER_TWO_DAYS_CATEGORY);
        }
    }

    private void sendReminderIfNeeded(HackathonEventEntity event,
                                      List<String> unresolvedIssues,
                                      LocalDateTime firstRoundStart,
                                      int daysRemaining,
                                      String category) {
        if (notificationRepository.existsByEventIdAndAnnouncementAudienceIgnoreCase(event.getEventId(), category)) {
            return;
        }
        notificationService.notifyCoordinatorTrackReadinessReminder(
                event,
                unresolvedIssues,
                firstRoundStart,
                daysRemaining,
                category
        );
    }

    private boolean isEventStartConfirmed(Integer eventId) {
        return notificationRepository.existsByEventIdAndAnnouncementAudienceIgnoreCase(
                eventId,
                EVENT_START_CONFIRMED_CATEGORY
        );
    }

    private boolean isRegistrationClosed(HackathonEventEntity event, LocalDateTime now) {
        return event.getRegistrationEndAt() != null && !now.isBefore(event.getRegistrationEndAt());
    }

    private LocalDateTime resolveFirstRoundStart(HackathonEventEntity event) {
        if (event.getCompetitionStartAt() != null) {
            return event.getCompetitionStartAt();
        }

        return roundRepository.findByEventIdOrderByRoundOrderAsc(event.getEventId()).stream()
                .min(Comparator.comparing(RoundEntity::getRoundOrder, Comparator.nullsLast(Integer::compareTo)))
                .flatMap(this::extractRoundStart)
                .orElse(null);
    }

    private Optional<LocalDateTime> extractRoundStart(RoundEntity round) {
        if (round == null) {
            return Optional.empty();
        }
        if (round.getStartAt() != null) {
            return Optional.of(round.getStartAt());
        }
        return Optional.ofNullable(round.getSubmissionDeadline());
    }

    private List<String> extractBlockingIssues(TeamFormationDashboardDto dashboard) {
        if (dashboard == null || dashboard.actionRequired() == null) {
            return List.of();
        }
        return dashboard.actionRequired().stream()
                .filter(this::isBlockingIssue)
                .map(TeamFormationActionRequiredDto::message)
                .toList();
    }

    private boolean isBlockingIssue(TeamFormationActionRequiredDto item) {
        if (item == null || item.type() == null) {
            return false;
        }
        return switch (item.type()) {
            case "TRACK_AT_CAPACITY" -> false;
            default -> true;
        };
    }

    private String buildAutoCancelReason(LocalDateTime firstRoundStart, List<String> unresolvedIssues) {
        return "The first round reached its start time on "
                + firstRoundStart
                + " while the event still had unresolved team/track readiness issues: "
                + String.join("; ", unresolvedIssues)
                + ". No coordinator resolution was completed before the first round began.";
    }
}
