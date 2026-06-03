package com.seal.hackathon.event.service;

import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.EventManagementDto;
import com.seal.hackathon.event.dto.EventConfigurationUpdateRequest;
import com.seal.hackathon.event.dto.EventSetupCreateRequest;
import com.seal.hackathon.event.dto.EventUpsertRequest;
import com.seal.hackathon.event.dto.RoundConfigurationRequest;
import com.seal.hackathon.event.dto.RoundManagementDto;
import com.seal.hackathon.event.dto.RoundUpsertRequest;
import com.seal.hackathon.event.dto.TrackDto;
import com.seal.hackathon.event.dto.TrackConfigurationRequest;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
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
    public EventManagementDto createEventWithInitialConfiguration(EventSetupCreateRequest request) {
        validateInitialConfiguration(
                request.event().startDate(),
                request.event().endDate(),
                request.tracks(),
                request.rounds()
        );

        EventManagementDto createdEvent = createEvent(request.event());
        Integer eventId = createdEvent.eventId();

        for (TrackUpsertRequest trackRequest : request.tracks()) {
            createTrack(eventId, trackRequest);
        }
        for (RoundUpsertRequest roundRequest : request.rounds()) {
            createRound(eventId, roundRequest);
        }

        return createdEvent;
    }

    @Transactional
    public EventManagementDto updateEvent(Integer eventId, EventUpsertRequest request) {
        validateEventDateRange(request.startDate(), request.endDate());
        HackathonEventEntity event = getEventOrThrow(eventId);
        String season = normalizeSeason(request.season());
        ensureSeasonYearUnique(request.year(), season, eventId);
        validateExistingRoundDeadlines(eventId, request.startDate(), request.endDate());
        applyEventRequest(event, request, season, false);
        return toEventDto(eventRepository.save(event));
    }

    @Transactional
    public EventManagementDto updateEventConfiguration(Integer eventId, EventConfigurationUpdateRequest request) {
        validateInitialConfiguration(
                request.event().startDate(),
                request.event().endDate(),
                request.tracks().stream().map(track -> new TrackUpsertRequest(track.name())).toList(),
                request.rounds().stream().map(round -> new RoundUpsertRequest(
                        round.roundName(),
                        round.roundOrder(),
                        round.submissionDeadline(),
                        round.promotionRuleTopN()
                )).toList()
        );

        HackathonEventEntity event = getEventOrThrow(eventId);
        String season = normalizeSeason(request.event().season());
        ensureSeasonYearUnique(request.event().year(), season, eventId);
        applyEventRequestWithoutConfiguredReadiness(event, request.event(), season);
        eventRepository.save(event);

        syncTracks(eventId, request.tracks());
        syncRounds(eventId, request.rounds());

        return toEventDto(event);
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
        TrackEntity track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Track not found"));
        if (trackRepository.countByEventId(track.getEventId()) <= 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Each event must keep at least one track");
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
        HackathonEventEntity event = getEventOrThrow(eventId);
        validateRoundValues(request);
        validateSubmissionDeadlineWithinEvent(event.getStartDate(), event.getEndDate(), request.submissionDeadline());
        List<RoundEntity> existingRounds = roundRepository.findByEventIdOrderByRoundOrderAsc(eventId);
        validateRoundInsertPosition(request.roundOrder(), existingRounds.size() + 1);
        shiftRoundsForInsert(existingRounds, request.roundOrder());

        RoundEntity round = new RoundEntity();
        round.setEventId(eventId);
        applyRoundRequest(round, request);
        return toRoundDto(roundRepository.save(round));
    }

    @Transactional
    public RoundManagementDto updateRound(Integer roundId, RoundUpsertRequest request) {
        RoundEntity round = roundRepository.findById(roundId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round not found"));
        HackathonEventEntity event = getEventOrThrow(round.getEventId());
        validateRoundValues(request);
        validateSubmissionDeadlineWithinEvent(event.getStartDate(), event.getEndDate(), request.submissionDeadline());
        List<RoundEntity> roundsInEvent = roundRepository.findByEventIdOrderByRoundOrderAsc(round.getEventId());
        validateRoundInsertPosition(request.roundOrder(), roundsInEvent.size());
        reorderRoundsForMove(roundsInEvent, roundId, request.roundOrder());
        applyRoundRequest(round, request);
        return toRoundDto(roundRepository.save(round));
    }

    @Transactional
    public void deleteRound(Integer roundId) {
        RoundEntity round = roundRepository.findById(roundId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round not found"));
        if (roundRepository.countByEventId(round.getEventId()) <= 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Each event must keep at least one round");
        }
        Integer removedOrder = round.getRoundOrder();
        roundRepository.deleteById(roundId);
        List<RoundEntity> remainingRounds = roundRepository.findByEventIdOrderByRoundOrderAsc(round.getEventId());
        for (RoundEntity remaining : remainingRounds) {
          if (remaining.getRoundOrder() > removedOrder) {
              remaining.setRoundOrder(remaining.getRoundOrder() - 1);
              roundRepository.save(remaining);
          }
        }
    }

    private void validateInitialConfiguration(LocalDate startDate,
                                              LocalDate endDate,
                                              List<TrackUpsertRequest> tracks,
                                              List<RoundUpsertRequest> rounds) {
        if (tracks == null || tracks.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Each event must be created with at least one track");
        }
        if (rounds == null || rounds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Each event must be created with at least one round");
        }

        Set<String> trackNames = new HashSet<>();
        for (TrackUpsertRequest track : tracks) {
            String normalized = track.name().trim().toLowerCase(Locale.ROOT);
            if (!trackNames.add(normalized)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Track names must be unique within the event setup");
            }
        }

        Set<Integer> roundOrders = new HashSet<>();
        for (RoundUpsertRequest round : rounds) {
            validateRoundValues(round);
            validateSubmissionDeadlineWithinEvent(startDate, endDate, round.submissionDeadline());
            if (!roundOrders.add(round.roundOrder())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Round order must be unique within the event setup");
            }
        }
        List<Integer> sortedOrders = rounds.stream()
                .map(RoundUpsertRequest::roundOrder)
                .sorted()
                .toList();
        for (int index = 0; index < sortedOrders.size(); index += 1) {
            int expectedOrder = index + 1;
            if (sortedOrders.get(index) != expectedOrder) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Round order must start at 1 and remain consecutive without gaps"
                );
            }
        }
    }

    private void validateRoundValues(RoundUpsertRequest request) {
        if (request.roundOrder() == null || request.roundOrder() < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Round order must be at least 1");
        }
        if (request.promotionRuleTopN() == null || request.promotionRuleTopN() < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Top N teams per track must be at least 1");
        }
    }

    private void validateRoundInsertPosition(Integer requestedOrder, int maxAllowedOrder) {
        if (requestedOrder == null || requestedOrder < 1 || requestedOrder > maxAllowedOrder) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Round order must start at 1 and stay consecutive within the event sequence"
            );
        }
    }

    private void shiftRoundsForInsert(List<RoundEntity> rounds, Integer requestedOrder) {
        List<RoundEntity> affectedRounds = rounds.stream()
                .filter(existing -> existing.getRoundOrder() >= requestedOrder)
                .sorted(Comparator.comparing(RoundEntity::getRoundOrder).reversed())
                .toList();
        for (RoundEntity existing : affectedRounds) {
            existing.setRoundOrder(existing.getRoundOrder() + 1);
            roundRepository.save(existing);
        }
        if (!affectedRounds.isEmpty()) {
            roundRepository.flush();
        }
    }

    private void reorderRoundsForMove(List<RoundEntity> roundsInEvent, Integer roundId, Integer targetOrder) {
        RoundEntity movingRound = roundsInEvent.stream()
                .filter(existing -> existing.getRoundId().equals(roundId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round not found"));

        int currentOrder = movingRound.getRoundOrder();
        if (currentOrder == targetOrder) {
            return;
        }

        // Release the current slot first so the event/order unique constraint never sees
        // two rounds sharing the same value during the intermediate shift.
        movingRound.setRoundOrder(0);
        roundRepository.saveAndFlush(movingRound);

        if (targetOrder < currentOrder) {
            for (RoundEntity existing : roundsInEvent) {
                if (!existing.getRoundId().equals(roundId)
                        && existing.getRoundOrder() >= targetOrder
                        && existing.getRoundOrder() < currentOrder) {
                    existing.setRoundOrder(existing.getRoundOrder() + 1);
                    roundRepository.save(existing);
                }
            }
            roundRepository.flush();
            return;
        }

        for (RoundEntity existing : roundsInEvent) {
            if (!existing.getRoundId().equals(roundId)
                    && existing.getRoundOrder() <= targetOrder
                    && existing.getRoundOrder() > currentOrder) {
                existing.setRoundOrder(existing.getRoundOrder() - 1);
                roundRepository.save(existing);
            }
        }
        roundRepository.flush();
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

    private void validateEventDateRange(LocalDate startDate, LocalDate endDate) {
        if (!endDate.isAfter(startDate)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "End date must be after start date");
        }
    }

    private void validateSubmissionDeadlineWithinEvent(LocalDate startDate,
                                                       LocalDate endDate,
                                                       LocalDateTime submissionDeadline) {
        LocalDate submissionDate = submissionDeadline.toLocalDate();
        if (submissionDate.isBefore(startDate) || submissionDate.isAfter(endDate)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Submission deadline must be within the event start and end dates"
            );
        }
    }

    private void validateExistingRoundDeadlines(Integer eventId, LocalDate startDate, LocalDate endDate) {
        for (RoundEntity round : roundRepository.findByEventIdOrderByRoundOrderAsc(eventId)) {
            validateSubmissionDeadlineWithinEvent(startDate, endDate, round.getSubmissionDeadline());
        }
    }

    private void syncTracks(Integer eventId, List<TrackConfigurationRequest> requests) {
        List<TrackEntity> existingTracks = trackRepository.findByEventIdOrderByTrackIdAsc(eventId);
        Map<Integer, TrackEntity> existingById = existingTracks.stream()
                .collect(java.util.stream.Collectors.toMap(TrackEntity::getTrackId, track -> track));
        Set<Integer> requestedIds = new HashSet<>();

        for (TrackConfigurationRequest request : requests) {
            if (request.trackId() != null) {
                TrackEntity existing = existingById.get(request.trackId());
                if (existing == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Track does not belong to this event");
                }
                existing.setName(request.name().trim());
                trackRepository.save(existing);
                requestedIds.add(existing.getTrackId());
            } else {
                TrackEntity created = new TrackEntity();
                created.setEventId(eventId);
                created.setName(request.name().trim());
                trackRepository.save(created);
            }
        }

        List<TrackEntity> tracksToDelete = existingTracks.stream()
                .filter(track -> !requestedIds.contains(track.getTrackId()))
                .toList();
        for (TrackEntity track : tracksToDelete) {
            trackRepository.delete(track);
        }
    }

    private void syncRounds(Integer eventId, List<RoundConfigurationRequest> requests) {
        List<RoundEntity> existingRounds = roundRepository.findByEventIdOrderByRoundOrderAsc(eventId);
        Map<Integer, RoundEntity> existingById = existingRounds.stream()
                .collect(java.util.stream.Collectors.toMap(RoundEntity::getRoundId, round -> round));
        Set<Integer> requestedIds = new HashSet<>();

        int tempOrder = requests.size() + existingRounds.size() + 10;
        for (RoundEntity round : existingRounds) {
            round.setRoundOrder(tempOrder++);
            roundRepository.save(round);
        }
        if (!existingRounds.isEmpty()) {
            roundRepository.flush();
        }

        for (RoundConfigurationRequest request : requests) {
            RoundEntity round;
            if (request.roundId() != null) {
                round = existingById.get(request.roundId());
                if (round == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Round does not belong to this event");
                }
                requestedIds.add(round.getRoundId());
            } else {
                round = new RoundEntity();
                round.setEventId(eventId);
            }

            round.setRoundName(request.roundName().trim());
            round.setRoundOrder(request.roundOrder());
            round.setSubmissionDeadline(request.submissionDeadline());
            round.setPromotionRuleTopN(request.promotionRuleTopN());
            roundRepository.save(round);
        }
        roundRepository.flush();

        List<RoundEntity> roundsToDelete = existingRounds.stream()
                .filter(round -> !requestedIds.contains(round.getRoundId()))
                .toList();
        for (RoundEntity round : roundsToDelete) {
            roundRepository.delete(round);
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

    private void applyEventRequestWithoutConfiguredReadiness(HackathonEventEntity event,
                                                             EventUpsertRequest request,
                                                             String season) {
        EventStatus nextStatus = EventStatus.from(request.status());
        validateStatusTransition(event, nextStatus);

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
            throw new ApiException(HttpStatus.CONFLICT, "An event for this season and year already exists");
        }
    }

    private void validateStatusTransition(HackathonEventEntity event, EventStatus nextStatus) {
        EventStatus currentStatus = EventStatus.from(event.getStatus());
        if (currentStatus == nextStatus) {
            return;
        }
        if (currentStatus.isTerminal()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Cannot change event status from " + currentStatus.getDbValue() + " to " + nextStatus.getDbValue());
        }
        if (nextStatus == EventStatus.CANCELLED) {
            if (Set.of(EventStatus.DRAFT, EventStatus.CONFIGURED, EventStatus.REGISTRATION_OPEN, EventStatus.ONGOING)
                    .contains(currentStatus)) {
                return;
            }
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Cannot change event status from " + currentStatus.getDbValue() + " to Cancelled");
        }

        if (nextStatus.ordinal() != currentStatus.ordinal() + 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Cannot change event status from " + currentStatus.getDbValue() + " to " + nextStatus.getDbValue());
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
