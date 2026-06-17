package com.seal.hackathon.event;

import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.EventSetupCreateRequest;
import com.seal.hackathon.event.dto.EventConfigurationUpdateRequest;
import com.seal.hackathon.event.dto.EventUpsertRequest;
import com.seal.hackathon.event.dto.RoundConfigurationRequest;
import com.seal.hackathon.event.dto.RoundUpsertRequest;
import com.seal.hackathon.event.dto.TrackConfigurationRequest;
import com.seal.hackathon.event.dto.TrackUpsertRequest;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.event.service.EventManagementService;
import com.seal.hackathon.team.repository.TeamRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventManagementServiceTest {

    @Mock
    private HackathonEventRepository eventRepository;
    @Mock
    private TrackRepository trackRepository;
    @Mock
    private RoundRepository roundRepository;
    @Mock
    private TeamRepository teamRepository;

    @InjectMocks
    private EventManagementService eventManagementService;

    @Test
    void createEvent_shouldRejectDuplicateSemesterYear() {
        EventUpsertRequest request = newRequest("Fall", 2026, EventStatus.DRAFT.getDbValue());
        when(eventRepository.existsByYearAndSemesterIgnoreCase(2026, "Fall")).thenReturn(true);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.createEvent(request));

        Assertions.assertNotNull(ex.getMessage());
    }

    @Test
    void createEvent_shouldStartAsDraft() {
        EventUpsertRequest request = newRequest("Fall", 2026, EventStatus.ONGOING.getDbValue());
        when(eventRepository.existsByYearAndSemesterIgnoreCase(2026, "Fall")).thenReturn(false);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.createEvent(request));

        Assertions.assertTrue(ex.getMessage().contains("New event must start in Draft"));
    }

    @Test
    void createEvent_shouldRejectEndDateNotAfterStartDate() {
        EventUpsertRequest request = new EventUpsertRequest(
                "SEAL Fall 2026",
                "Fall",
                2026,
                LocalDate.of(2026, 10, 10),
                LocalDate.of(2026, 10, 10),
                EventStatus.DRAFT.getDbValue(),
                "Test event"
        );

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.createEvent(request));

        Assertions.assertTrue(ex.getMessage().contains("End date must be after start date"));
    }

    @Test
    void updateEvent_shouldRejectSkippedStateTransition() {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(1);
        event.setStatus(EventStatus.DRAFT.getDbValue());

        EventUpsertRequest request = newRequest("Fall", 2026, EventStatus.ONGOING.getDbValue());
        when(eventRepository.findById(1)).thenReturn(Optional.of(event));
        when(eventRepository.existsByYearAndSemesterIgnoreCaseAndEventIdNot(2026, "Fall", 1)).thenReturn(false);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.updateEvent(1, request));

        Assertions.assertNotNull(ex.getMessage());
    }

    @Test
    void createEventWithInitialConfiguration_shouldRejectMissingTrackOrRound() {
        EventSetupCreateRequest request = new EventSetupCreateRequest(
                newRequest("Fall", 2026, EventStatus.DRAFT.getDbValue()),
                List.of(),
                List.of(newRoundRequest(1))
        );

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.createEventWithInitialConfiguration(request));

        Assertions.assertTrue(ex.getMessage().contains("at least one track"));
    }

    @Test
    void createEventWithInitialConfiguration_shouldCreateEventAndInitialSetup() {
        HackathonEventEntity savedEvent = new HackathonEventEntity();
        savedEvent.setEventId(10);
        savedEvent.setStatus(EventStatus.DRAFT.getDbValue());
        savedEvent.setStartDate(LocalDate.of(2026, 10, 10));
        savedEvent.setEndDate(LocalDate.of(2026, 11, 20));
        TrackEntity savedTrack = new TrackEntity();
        savedTrack.setTrackId(20);
        savedTrack.setEventId(10);
        savedTrack.setName("Web Platform");
        RoundEntity savedRound = new RoundEntity();
        savedRound.setRoundId(30);
        savedRound.setEventId(10);
        savedRound.setRoundName("Elimination");
        savedRound.setRoundOrder(1);
        savedRound.setSubmissionDeadline(LocalDateTime.of(2026, 10, 20, 23, 59));
        savedRound.setPromotionRuleTopN(2);

        when(eventRepository.existsByYearAndSemesterIgnoreCase(2026, "Fall")).thenReturn(false);
        when(eventRepository.save(any(HackathonEventEntity.class))).thenReturn(savedEvent);
        when(eventRepository.findById(10)).thenReturn(Optional.of(savedEvent));
        when(eventRepository.existsById(10)).thenReturn(true);
        when(trackRepository.existsByEventIdAndNameIgnoreCase(10, "Web Platform")).thenReturn(false);
        when(trackRepository.save(any(TrackEntity.class))).thenReturn(savedTrack);
        when(roundRepository.save(any(RoundEntity.class))).thenReturn(savedRound);

        EventSetupCreateRequest request = new EventSetupCreateRequest(
                newRequest("Fall", 2026, EventStatus.DRAFT.getDbValue()),
                List.of(new TrackUpsertRequest("Web Platform")),
                List.of(newRoundRequest(1))
        );

        eventManagementService.createEventWithInitialConfiguration(request);

        verify(trackRepository).save(any(TrackEntity.class));
        verify(roundRepository).save(any(RoundEntity.class));
    }

    @Test
    void createEventWithInitialConfiguration_shouldRejectDeadlineOutsideEventRange() {
        EventSetupCreateRequest request = new EventSetupCreateRequest(
                newRequest("Fall", 2026, EventStatus.DRAFT.getDbValue()),
                List.of(new TrackUpsertRequest("Web Platform")),
                List.of(new RoundUpsertRequest(
                        "Elimination",
                        1,
                        LocalDateTime.of(2026, 12, 1, 23, 59),
                        2
                ))
        );

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.createEventWithInitialConfiguration(request));

        Assertions.assertTrue(ex.getMessage().contains("Submission deadline must be within the event start and end dates"));
    }

    @Test
    void createEventWithInitialConfiguration_shouldRejectNonConsecutiveRoundOrder() {
        EventSetupCreateRequest request = new EventSetupCreateRequest(
                newRequest("Fall", 2026, EventStatus.DRAFT.getDbValue()),
                List.of(new TrackUpsertRequest("Web Platform")),
                List.of(
                        newRoundRequest(1),
                        new RoundUpsertRequest(
                                "Final",
                                3,
                                LocalDateTime.of(2026, 11, 15, 23, 59),
                                1
                        )
                )
        );

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.createEventWithInitialConfiguration(request));

        Assertions.assertTrue(ex.getMessage().contains("Round order must start at 1 and remain consecutive"));
    }

    @Test
    void createRound_shouldRejectDeadlineOutsideEventRange() {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(10);
        event.setStartDate(LocalDate.of(2026, 10, 10));
        event.setEndDate(LocalDate.of(2026, 11, 20));

        when(eventRepository.findById(10)).thenReturn(Optional.of(event));

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.createRound(10, new RoundUpsertRequest(
                        "Elimination",
                        1,
                        LocalDateTime.of(2026, 11, 25, 23, 59),
                        2
                )));

        Assertions.assertTrue(ex.getMessage().contains("Submission deadline must be within the event start and end dates"));
    }

    @Test
    void createRound_shouldShiftLaterRoundsWhenInsertedInMiddle() {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(10);
        event.setStartDate(LocalDate.of(2026, 10, 10));
        event.setEndDate(LocalDate.of(2026, 11, 20));

        RoundEntity roundOne = new RoundEntity();
        roundOne.setRoundId(1);
        roundOne.setEventId(10);
        roundOne.setRoundOrder(1);

        RoundEntity roundTwo = new RoundEntity();
        roundTwo.setRoundId(2);
        roundTwo.setEventId(10);
        roundTwo.setRoundOrder(2);

        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(roundRepository.findByEventIdOrderByRoundOrderAsc(10)).thenReturn(new ArrayList<>(List.of(roundOne, roundTwo)));
        when(roundRepository.save(any(RoundEntity.class))).thenAnswer(invocation -> {
            RoundEntity saved = invocation.getArgument(0);
            if (saved.getRoundId() == null) {
                saved.setRoundId(99);
            }
            return saved;
        });

        eventManagementService.createRound(10, new RoundUpsertRequest(
                "Semi Final",
                2,
                LocalDateTime.of(2026, 11, 1, 23, 59),
                2
        ));

        Assertions.assertEquals(3, roundTwo.getRoundOrder());
        verify(roundRepository, atLeastOnce()).save(roundTwo);
    }

    @Test
    void updateRound_shouldReorderOtherRoundsToKeepSequenceContinuous() {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(10);
        event.setStartDate(LocalDate.of(2026, 10, 10));
        event.setEndDate(LocalDate.of(2026, 11, 20));

        RoundEntity roundOne = new RoundEntity();
        roundOne.setRoundId(1);
        roundOne.setEventId(10);
        roundOne.setRoundOrder(1);

        RoundEntity roundTwo = new RoundEntity();
        roundTwo.setRoundId(2);
        roundTwo.setEventId(10);
        roundTwo.setRoundOrder(2);

        RoundEntity roundThree = new RoundEntity();
        roundThree.setRoundId(3);
        roundThree.setEventId(10);
        roundThree.setRoundOrder(3);
        roundThree.setRoundName("Final");

        when(roundRepository.findById(3)).thenReturn(Optional.of(roundThree));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(roundRepository.findByEventIdOrderByRoundOrderAsc(10))
                .thenReturn(new ArrayList<>(List.of(roundOne, roundTwo, roundThree)));
        when(roundRepository.save(any(RoundEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        eventManagementService.updateRound(3, new RoundUpsertRequest(
                "Final",
                2,
                LocalDateTime.of(2026, 11, 15, 23, 59),
                1
        ));

        Assertions.assertEquals(3, roundTwo.getRoundOrder());
        Assertions.assertEquals(2, roundThree.getRoundOrder());
    }

    @Test
    void updateRoundScoreLock_shouldPersistLockStateAndExposeItInDto() {
        RoundEntity round = new RoundEntity();
        round.setRoundId(30);
        round.setEventId(10);
        round.setRoundName("Final");
        round.setRoundOrder(2);
        round.setSubmissionDeadline(LocalDateTime.of(2026, 11, 15, 23, 59));
        round.setPromotionRuleTopN(1);
        round.setScoreLocked(false);

        when(roundRepository.findById(30)).thenReturn(Optional.of(round));
        when(roundRepository.save(round)).thenReturn(round);

        var dto = eventManagementService.updateRoundScoreLock(30, true);

        Assertions.assertTrue(round.getScoreLocked());
        Assertions.assertTrue(dto.scoreLocked());
        verify(roundRepository).save(round);
    }

    @Test
    void updateEvent_shouldRejectWhenExistingRoundDeadlineFallsOutsideNewRange() {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(10);
        event.setStatus(EventStatus.DRAFT.getDbValue());

        RoundEntity round = new RoundEntity();
        round.setRoundId(30);
        round.setEventId(10);
        round.setSubmissionDeadline(LocalDateTime.of(2026, 11, 10, 23, 59));

        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(eventRepository.existsByYearAndSemesterIgnoreCaseAndEventIdNot(2026, "Fall", 10)).thenReturn(false);
        when(roundRepository.findByEventIdOrderByRoundOrderAsc(10)).thenReturn(List.of(round));

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.updateEvent(10, new EventUpsertRequest(
                        "SEAL Fall 2026",
                        "Fall",
                        2026,
                        LocalDate.of(2026, 10, 10),
                        LocalDate.of(2026, 11, 1),
                        EventStatus.DRAFT.getDbValue(),
                        "Test event"
                )));

        Assertions.assertTrue(ex.getMessage().contains("Submission deadline must be within the event start and end dates"));
    }

    @Test
    void deleteTrack_shouldRejectRemovingLastTrack() {
        TrackEntity track = new TrackEntity();
        track.setTrackId(99);
        track.setEventId(7);

        when(trackRepository.findById(99)).thenReturn(Optional.of(track));
        when(trackRepository.countByEventId(7)).thenReturn(1L);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.deleteTrack(99));

        Assertions.assertTrue(ex.getMessage().contains("at least one track"));
    }

    @Test
    void deleteTrack_shouldRejectWhenTrackHasTeams() {
        TrackEntity track = new TrackEntity();
        track.setTrackId(99);
        track.setEventId(7);

        when(trackRepository.findById(99)).thenReturn(Optional.of(track));
        when(trackRepository.countByEventId(7)).thenReturn(2L);
        when(teamRepository.countByTrackTrackId(99)).thenReturn(1L);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.deleteTrack(99));

        Assertions.assertTrue(ex.getMessage().contains("teams have registered"));
    }

    @Test
    void updateEvent_shouldRejectStartingWithInvalidTeams() {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(10);
        event.setStatus(EventStatus.ONGOING.getDbValue());

        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(eventRepository.existsByYearAndSemesterIgnoreCaseAndEventIdNot(2026, "Fall", 10)).thenReturn(false);
        when(roundRepository.findByEventIdOrderByRoundOrderAsc(10)).thenReturn(List.of());
        when(teamRepository.countInvalidTeamSizesByEventId(10, 3, 5)).thenReturn(1L);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.updateEvent(10, newRequest("Fall", 2026, EventStatus.ONGOING.getDbValue())));

        Assertions.assertTrue(ex.getMessage().contains("3 to 5 members"));
    }

    @Test
    void deleteRound_shouldRejectRemovingLastRound() {
        RoundEntity round = new RoundEntity();
        round.setRoundId(88);
        round.setEventId(7);

        when(roundRepository.findById(88)).thenReturn(Optional.of(round));
        when(roundRepository.countByEventId(7)).thenReturn(1L);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.deleteRound(88));

        Assertions.assertTrue(ex.getMessage().contains("at least one round"));
    }

    @Test
    void deleteRound_shouldCloseOrderGapAfterRemoval() {
        RoundEntity deletingRound = new RoundEntity();
        deletingRound.setRoundId(2);
        deletingRound.setEventId(7);
        deletingRound.setRoundOrder(2);

        RoundEntity remainingRound = new RoundEntity();
        remainingRound.setRoundId(3);
        remainingRound.setEventId(7);
        remainingRound.setRoundOrder(3);

        when(roundRepository.findById(2)).thenReturn(Optional.of(deletingRound));
        when(roundRepository.countByEventId(7)).thenReturn(3L);
        when(roundRepository.findByEventIdOrderByRoundOrderAsc(7)).thenReturn(List.of(remainingRound));

        eventManagementService.deleteRound(2);

        Assertions.assertEquals(2, remainingRound.getRoundOrder());
        verify(roundRepository).save(remainingRound);
    }

    @Test
    void updateEventConfiguration_shouldSaveEventTracksAndRoundsTogether() {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(10);
        event.setStatus(EventStatus.DRAFT.getDbValue());
        event.setStartDate(LocalDate.of(2026, 10, 10));
        event.setEndDate(LocalDate.of(2026, 11, 20));

        TrackEntity existingTrack = new TrackEntity();
        existingTrack.setTrackId(1);
        existingTrack.setEventId(10);
        existingTrack.setName("Web");

        RoundEntity roundOne = new RoundEntity();
        roundOne.setRoundId(11);
        roundOne.setEventId(10);
        roundOne.setRoundOrder(1);
        roundOne.setRoundName("Elimination");
        roundOne.setSubmissionDeadline(LocalDateTime.of(2026, 10, 20, 23, 59));
        roundOne.setPromotionRuleTopN(2);

        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(eventRepository.existsByYearAndSemesterIgnoreCaseAndEventIdNot(2026, "Fall", 10)).thenReturn(false);
        when(trackRepository.findByEventIdOrderByTrackIdAsc(10)).thenReturn(List.of(existingTrack));
        when(roundRepository.findByEventIdOrderByRoundOrderAsc(10)).thenReturn(new ArrayList<>(List.of(roundOne)));
        when(eventRepository.save(any(HackathonEventEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(trackRepository.save(any(TrackEntity.class))).thenAnswer(invocation -> {
            TrackEntity saved = invocation.getArgument(0);
            if (saved.getTrackId() == null) {
                saved.setTrackId(99);
            }
            return saved;
        });
        when(roundRepository.save(any(RoundEntity.class))).thenAnswer(invocation -> {
            RoundEntity saved = invocation.getArgument(0);
            if (saved.getRoundId() == null) {
                saved.setRoundId(77);
            }
            return saved;
        });

        eventManagementService.updateEventConfiguration(10, new EventConfigurationUpdateRequest(
                newRequest("Fall", 2026, EventStatus.ONGOING.getDbValue()),
                List.of(
                        new TrackConfigurationRequest(1, "Web Platform"),
                        new TrackConfigurationRequest(null, "AI")
                ),
                List.of(
                        new RoundConfigurationRequest(
                                11,
                                "Final",
                                1,
                                LocalDateTime.of(2026, 10, 25, 23, 59),
                                1
                        ),
                        new RoundConfigurationRequest(
                                null,
                                "Closing Pitch",
                                2,
                                LocalDateTime.of(2026, 11, 10, 23, 59),
                                1
                        )
                )
        ));

        Assertions.assertEquals("Ongoing", event.getStatus());
        Assertions.assertEquals("Web Platform", existingTrack.getName());
        Assertions.assertEquals("Final", roundOne.getRoundName());
        Assertions.assertEquals(1, roundOne.getRoundOrder());
        verify(trackRepository, atLeastOnce()).save(any(TrackEntity.class));
        verify(roundRepository, atLeastOnce()).save(any(RoundEntity.class));
    }

    private EventUpsertRequest newRequest(String semester, Integer year, String status) {
        return new EventUpsertRequest(
                "SEAL " + semester + " " + year,
                semester,
                year,
                LocalDate.of(2026, 10, 10),
                LocalDate.of(2026, 11, 20),
                status,
                "Test event"
        );
    }

    private RoundUpsertRequest newRoundRequest(int roundOrder) {
        return new RoundUpsertRequest(
                "Elimination",
                roundOrder,
                LocalDateTime.of(2026, 10, 20, 23, 59),
                2
        );
    }
}
