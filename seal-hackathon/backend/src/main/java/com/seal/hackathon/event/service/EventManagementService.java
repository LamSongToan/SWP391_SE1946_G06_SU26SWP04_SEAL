package com.seal.hackathon.event.service;

import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.EventManagementDto;
import com.seal.hackathon.event.dto.EventUpsertRequest;
import com.seal.hackathon.event.dto.RoundManagementDto;
import com.seal.hackathon.event.dto.RoundUpsertRequest;
import com.seal.hackathon.event.dto.TrackDto;
import com.seal.hackathon.event.dto.TrackUpsertRequest;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class EventManagementService {

    private static final Map<String, String> ALLOWED_SEASONS = Map.of(
            "SPRING", "Spring",
            "SUMMER", "Summer",
            "FALL", "Fall"
    );

    private final HackathonEventRepository eventRepository;
    private final TrackRepository trackRepository;
    private final RoundRepository roundRepository;

    public EventManagementService(HackathonEventRepository eventRepository,
                                  TrackRepository trackRepository,
                                  RoundRepository roundRepository) {
        this.eventRepository = eventRepository;
        this.trackRepository = trackRepository;
        this.roundRepository = roundRepository;
    }

    @Transactional(readOnly = true)
    public java.util.List<EventManagementDto> listEvents() {
        return eventRepository.findAllByOrderByStartDateDescEventIdDesc()
                .stream()
                .map(this::toEventDto)
                .toList();
    }

    @Transactional
    public EventManagementDto createEvent(EventUpsertRequest request) {
        validateEventDateRange(request.startDate(), request.endDate());
        String season = normalizeSeason(request.season());
        ensureSeasonYearUnique(request.year(), season, null);
        HackathonEventEntity event = new HackathonEventEntity();
        applyEventRequest(event, request, season, true);
        return toEventDto(eventRepository.save(event));
    }

    @Transactional
    public EventManagementDto updateEvent(Integer eventId, EventUpsertRequest request) {
        validateEventDateRange(request.startDate(), request.endDate());
        HackathonEventEntity event = getEventOrThrow(eventId);
        String season = normalizeSeason(request.season());
        ensureSeasonYearUnique(request.year(), season, eventId);
        applyEventRequest(event, request, season, false);
        return toEventDto(eventRepository.save(event));
    }

    @Transactional
    public void deleteEvent(Integer eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Event not found");
        }
        eventRepository.deleteById(eventId);
    }

    @Transactional(readOnly = true)
    public java.util.List<TrackDto> listTracks(Integer eventId) {
        ensureEventExists(eventId);
        return trackRepository.findByEventIdOrderByTrackIdAsc(eventId)
                .stream()
                .map(this::toTrackDto)
                .toList();
    }

    @Transactional
    public TrackDto createTrack(Integer eventId, TrackUpsertRequest request) {
        ensureEventExists(eventId);
        String trackName = request.name().trim();
        if (trackRepository.existsByEventIdAndNameIgnoreCase(eventId, trackName)) {
            throw new ApiException(HttpStatus.CONFLICT, "Track name already exists in this event");
        }

        TrackEntity track = new TrackEntity();
        track.setEventId(eventId);
        track.setName(trackName);
        return toTrackDto(trackRepository.save(track));
    }

    @Transactional
    public TrackDto updateTrack(Integer trackId, TrackUpsertRequest request) {
        TrackEntity track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Track not found"));

        String nextName = request.name().trim();
        if (!track.getName().equalsIgnoreCase(nextName)
                && trackRepository.existsByEventIdAndNameIgnoreCase(track.getEventId(), nextName)) {
            throw new ApiException(HttpStatus.CONFLICT, "Track name already exists in this event");
        }
        track.setName(nextName);
        return toTrackDto(trackRepository.save(track));
    }

    @Transactional
    public void deleteTrack(Integer trackId) {
        if (!trackRepository.existsById(trackId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Track not found");
        }
        trackRepository.deleteById(trackId);
    }

    @Transactional(readOnly = true)
    public java.util.List<RoundManagementDto> listRounds(Integer eventId) {
        ensureEventExists(eventId);
        return roundRepository.findByEventIdOrderByRoundOrderAsc(eventId)
                .stream()
                .map(this::toRoundDto)
                .toList();
    }

    @Transactional
    public RoundManagementDto createRound(Integer eventId, RoundUpsertRequest request) {
        ensureEventExists(eventId);
        ensureRoundOrderUnique(eventId, request.roundOrder(), null);

        RoundEntity round = new RoundEntity();
        round.setEventId(eventId);
        applyRoundRequest(round, request);
        return toRoundDto(roundRepository.save(round));
    }

    @Transactional
    public RoundManagementDto updateRound(Integer roundId, RoundUpsertRequest request) {
        RoundEntity round = roundRepository.findById(roundId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round not found"));
        ensureRoundOrderUnique(round.getEventId(), request.roundOrder(), roundId);
        applyRoundRequest(round, request);
        return toRoundDto(roundRepository.save(round));
    }

    @Transactional
    public void deleteRound(Integer roundId) {
        if (!roundRepository.existsById(roundId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Round not found");
        }
        roundRepository.deleteById(roundId);
    }

    private void ensureRoundOrderUnique(Integer eventId, Integer roundOrder, Integer currentRoundId) {
        roundRepository.findByEventIdAndRoundOrder(eventId, roundOrder).ifPresent(existing -> {
            if (currentRoundId == null || !existing.getRoundId().equals(currentRoundId)) {
                throw new ApiException(HttpStatus.CONFLICT, "Round order already exists in this event");
            }
        });
    }

    private void ensureEventExists(Integer eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Event not found");
        }
    }

    private HackathonEventEntity getEventOrThrow(Integer eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    private void validateEventDateRange(java.time.LocalDate startDate, java.time.LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "endDate must be on or after startDate");
        }
    }

    private void applyEventRequest(HackathonEventEntity event,
                                   EventUpsertRequest request,
                                   String season,
                                   boolean creating) {
        EventStatus nextStatus = EventStatus.from(request.status());
        if (creating && nextStatus != EventStatus.DRAFT) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "New event must start in Draft status");
        }
        if (!creating) {
            validateStatusTransition(event, nextStatus);
        }

        if (nextStatus == EventStatus.CONFIGURED) {
            validateConfiguredReadiness(event.getEventId());
        }

        event.setName(request.name().trim());
        event.setSeason(season);
        event.setYear(request.year());
        event.setStartDate(request.startDate());
        event.setEndDate(request.endDate());
        event.setStatus(nextStatus.getDbValue());
        event.setDescription(request.description() == null ? null : request.description().trim());
    }

    private String normalizeSeason(String rawSeason) {
        String normalizedSeasonKey = rawSeason.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_SEASONS.containsKey(normalizedSeasonKey)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "season must be one of: Spring, Summer, Fall");
        }
        return ALLOWED_SEASONS.get(normalizedSeasonKey);
    }

    private void ensureSeasonYearUnique(Integer year, String season, Integer currentEventId) {
        boolean exists = currentEventId == null
                ? eventRepository.existsByYearAndSeasonIgnoreCase(year, season)
                : eventRepository.existsByYearAndSeasonIgnoreCaseAndEventIdNot(year, season, currentEventId);
        if (exists) {
            throw new ApiException(HttpStatus.CONFLICT, "Sự kiện mùa này đã tồn tại trong năm");
        }
    }

    private void validateStatusTransition(HackathonEventEntity event, EventStatus nextStatus) {
        EventStatus currentStatus = EventStatus.from(event.getStatus());
        if (currentStatus == nextStatus) {
            return;
        }
        if (currentStatus.isTerminal()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không thể chuyển trạng thái từ " + currentStatus.getDbValue() + " sang " + nextStatus.getDbValue());
        }
        if (nextStatus == EventStatus.CANCELLED) {
            if (Set.of(EventStatus.DRAFT, EventStatus.CONFIGURED, EventStatus.REGISTRATION_OPEN, EventStatus.ONGOING)
                    .contains(currentStatus)) {
                return;
            }
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không thể chuyển trạng thái từ " + currentStatus.getDbValue() + " sang Cancelled");
        }

        if (nextStatus.ordinal() != currentStatus.ordinal() + 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không thể chuyển trạng thái từ " + currentStatus.getDbValue() + " sang " + nextStatus.getDbValue());
        }
    }

    private void validateConfiguredReadiness(Integer eventId) {
        if (eventId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Event must be saved before configuring");
        }
        if (trackRepository.findByEventIdOrderByTrackIdAsc(eventId).isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Configured event requires at least one track");
        }
        if (roundRepository.findByEventIdOrderByRoundOrderAsc(eventId).isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Configured event requires at least one round");
        }
    }

    private void applyRoundRequest(RoundEntity round, RoundUpsertRequest request) {
        round.setRoundName(request.roundName().trim());
        round.setRoundOrder(request.roundOrder());
        round.setSubmissionDeadline(request.submissionDeadline());
        round.setPromotionRuleTopN(request.promotionRuleTopN());
    }

    private EventManagementDto toEventDto(HackathonEventEntity event) {
        return new EventManagementDto(
                event.getEventId(),
                event.getName(),
                event.getSeason(),
                event.getYear(),
                event.getStartDate(),
                event.getEndDate(),
                event.getStatus(),
                event.getDescription()
        );
    }

    private TrackDto toTrackDto(TrackEntity track) {
        return new TrackDto(track.getTrackId(), track.getEventId(), track.getName());
    }

    private RoundManagementDto toRoundDto(RoundEntity round) {
        return new RoundManagementDto(
                round.getRoundId(),
                round.getEventId(),
                round.getRoundName(),
                round.getRoundOrder(),
                round.getSubmissionDeadline(),
                round.getPromotionRuleTopN()
        );
    }
}
