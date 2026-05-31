package com.seal.hackathon.event;

import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.EventUpsertRequest;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.event.service.EventManagementService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventManagementServiceTest {

    @Mock
    private HackathonEventRepository eventRepository;
    @Mock
    private TrackRepository trackRepository;
    @Mock
    private RoundRepository roundRepository;

    @InjectMocks
    private EventManagementService eventManagementService;

    @Test
    void createEvent_shouldRejectDuplicateSeasonYear() {
        EventUpsertRequest request = newRequest("Fall", 2026, EventStatus.DRAFT.getDbValue());
        when(eventRepository.existsByYearAndSeasonIgnoreCase(2026, "Fall")).thenReturn(true);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.createEvent(request));

        Assertions.assertTrue(ex.getMessage().contains("Sự kiện mùa này đã tồn tại"));
    }

    @Test
    void createEvent_shouldStartAsDraft() {
        EventUpsertRequest request = newRequest("Fall", 2026, EventStatus.REGISTRATION_OPEN.getDbValue());
        when(eventRepository.existsByYearAndSeasonIgnoreCase(2026, "Fall")).thenReturn(false);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.createEvent(request));

        Assertions.assertTrue(ex.getMessage().contains("New event must start in Draft"));
    }

    @Test
    void updateEvent_shouldRejectSkippedStateTransition() {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(1);
        event.setStatus(EventStatus.DRAFT.getDbValue());

        EventUpsertRequest request = newRequest("Fall", 2026, EventStatus.ONGOING.getDbValue());
        when(eventRepository.findById(1)).thenReturn(Optional.of(event));
        when(eventRepository.existsByYearAndSeasonIgnoreCaseAndEventIdNot(2026, "Fall", 1)).thenReturn(false);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> eventManagementService.updateEvent(1, request));

        Assertions.assertTrue(ex.getMessage().contains("Không thể chuyển trạng thái"));
    }

    private EventUpsertRequest newRequest(String season, Integer year, String status) {
        return new EventUpsertRequest(
                "SEAL " + season + " " + year,
                season,
                year,
                LocalDate.of(2026, 10, 10),
                LocalDate.of(2026, 11, 20),
                status,
                "Test event"
        );
    }
}
