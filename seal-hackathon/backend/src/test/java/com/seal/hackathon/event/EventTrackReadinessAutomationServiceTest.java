package com.seal.hackathon.event.service;

import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.EventUpdateNotificationRepository;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.team.repository.TeamRepository;
import com.seal.hackathon.team.dto.TeamFormationActionRequiredDto;
import com.seal.hackathon.team.dto.TeamFormationDashboardDto;
import com.seal.hackathon.team.service.TeamFormationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventTrackReadinessAutomationServiceTest {

    @Mock
    private HackathonEventRepository eventRepository;
    @Mock
    private RoundRepository roundRepository;
    @Mock
    private TrackRepository trackRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private EventUpdateNotificationRepository notificationRepository;
    @Mock
    private EventUpdateNotificationService notificationService;
    @Mock
    private EventManagementService eventManagementService;
    @Mock
    private TeamFormationService teamFormationService;

    @InjectMocks
    private EventTrackReadinessAutomationService automationService;

    @Test
    void handleEvent_shouldNotifyCoordinatorTwoDaysBeforeFirstRound() {
        HackathonEventEntity event = event(10, LocalDateTime.of(2026, 7, 12, 9, 0));
        LocalDateTime now = LocalDateTime.of(2026, 7, 10, 12, 0);
        TrackEntity track = track(20, 10, "AI & Data", 4);

        when(teamFormationService.getFormationDashboard(10))
                .thenReturn(dashboard("AI & Data (2/4 teams)"));
        when(notificationRepository.existsByEventIdAndAnnouncementAudienceIgnoreCase(10, "SYSTEM_EVENT_STARTED"))
                .thenReturn(false);
        when(notificationRepository.existsByEventIdAndAnnouncementAudienceIgnoreCase(10, "SYSTEM_TRACK_REVIEW_REMINDER_2D"))
                .thenReturn(false);

        automationService.handleEvent(event, now);

        verify(notificationService).notifyCoordinatorTrackReadinessReminder(
                eq(event),
                anyList(),
                eq(LocalDateTime.of(2026, 7, 12, 9, 0)),
                eq(2),
                eq("SYSTEM_TRACK_REVIEW_REMINDER_2D")
        );
        verify(eventManagementService, never()).cancelEventAutomatically(eq(10), contains("below the minimum"));
    }

    @Test
    void handleEvent_shouldAutoCancelWhenFirstRoundStartsWithUnresolvedTrackShortage() {
        HackathonEventEntity event = event(10, LocalDateTime.of(2026, 7, 10, 9, 0));
        LocalDateTime now = LocalDateTime.of(2026, 7, 10, 9, 0);
        TrackEntity track = track(20, 10, "Web Platform", 3);

        when(teamFormationService.getFormationDashboard(10))
                .thenReturn(dashboard("Web Platform (1/3 teams)"));
        when(notificationRepository.existsByEventIdAndAnnouncementAudienceIgnoreCase(10, "SYSTEM_EVENT_STARTED"))
                .thenReturn(false);

        automationService.handleEvent(event, now);

        verify(eventManagementService).cancelEventAutomatically(
                eq(10),
                contains("Web Platform (1/3 teams)")
        );
        verify(notificationService, never()).notifyCoordinatorTrackReadinessReminder(
                eq(event),
                anyList(),
                eq(LocalDateTime.of(2026, 7, 10, 9, 0)),
                eq(1),
                eq("SYSTEM_TRACK_REVIEW_REMINDER_1D")
        );
    }

    private HackathonEventEntity event(Integer eventId, LocalDateTime competitionStartAt) {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(eventId);
        event.setName("SEAL Summer 2026");
        event.setStatus("Ongoing");
        event.setRegistrationEndAt(competitionStartAt.minusDays(3));
        event.setCompetitionStartAt(competitionStartAt);
        return event;
    }

    private TrackEntity track(Integer trackId, Integer eventId, String name, Integer minTeams) {
        TrackEntity track = new TrackEntity();
        track.setTrackId(trackId);
        track.setEventId(eventId);
        track.setName(name);
        track.setMinTeams(minTeams);
        return track;
    }

    private TeamFormationDashboardDto dashboard(String issueMessage) {
        TeamFormationActionRequiredDto issue = new TeamFormationActionRequiredDto(
                "TRACK_BELOW_MINIMUM",
                "WARNING",
                issueMessage,
                null,
                null,
                null
        );
        return new TeamFormationDashboardDto(
                10,
                "SEAL Summer 2026",
                "Ongoing",
                null,
                3,
                5,
                "TEAM_SELECT",
                true,
                false,
                List.of(issue),
                List.of(),
                List.of(),
                List.of()
        );
    }
}
