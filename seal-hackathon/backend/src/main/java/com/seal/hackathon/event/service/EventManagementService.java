package com.seal.hackathon.event.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.evaluation.service.AuditLogService;
import com.seal.hackathon.event.dto.EventManagementDto;
import com.seal.hackathon.event.dto.EventConfigurationUpdateRequest;
import com.seal.hackathon.event.dto.EventSetupCreateRequest;
import com.seal.hackathon.event.dto.EventUpsertRequest;
import com.seal.hackathon.event.dto.EventWizardAwardRequest;
import com.seal.hackathon.event.dto.EventWizardCriterionRequest;
import com.seal.hackathon.event.dto.EventWizardDetailDto;
import com.seal.hackathon.event.dto.EventWizardRequest;
import com.seal.hackathon.event.dto.EventWizardRoundRequest;
import com.seal.hackathon.event.dto.EventWizardTrackRequest;
import com.seal.hackathon.event.dto.RoundConfigurationRequest;
import com.seal.hackathon.event.dto.RoundManagementDto;
import com.seal.hackathon.event.dto.RoundUpsertRequest;
import com.seal.hackathon.event.dto.TrackDto;
import com.seal.hackathon.event.dto.TrackConfigurationRequest;
import com.seal.hackathon.event.dto.TrackUpsertRequest;
import com.seal.hackathon.event.entity.EventStatus;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.ScoringCriteriaEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.event.repository.ScoringCriteriaRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.team.repository.TeamRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Set;

@Service
public class EventManagementService {

    private static final int MIN_TEAM_SIZE = 3;
    private static final int MAX_TEAM_SIZE = 5;

    private static final Map<String, String> ALLOWED_SEMESTERS = Map.of(
            "SPRING", "Spring",
            "SUMMER", "Summer",
            "FALL", "Fall"
    );

    private final HackathonEventRepository eventRepository;
    private final TrackRepository trackRepository;
    private final RoundRepository roundRepository;
    private final ScoringCriteriaRepository scoringCriteriaRepository;
    private final TeamRepository teamRepository;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;

    public EventManagementService(HackathonEventRepository eventRepository,
                                   TrackRepository trackRepository,
                                   RoundRepository roundRepository,
                                   ScoringCriteriaRepository scoringCriteriaRepository,
                                   TeamRepository teamRepository,
                                   ObjectMapper objectMapper,
                                   AuditLogService auditLogService) {
        this.eventRepository = eventRepository;
        this.trackRepository = trackRepository;
        this.roundRepository = roundRepository;
        this.scoringCriteriaRepository = scoringCriteriaRepository;
        this.teamRepository = teamRepository;
        this.objectMapper = objectMapper;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public java.util.List<EventManagementDto> listEvents() {
        return eventRepository.findAllByOrderByEventIdDesc()
                .stream()
                .map(this::synchronizeLifecycleStatus)
                .map(this::toEventDto)
                .toList();
    }

    @Transactional
    public EventWizardDetailDto getEventWizard(Integer eventId) {
        HackathonEventEntity event = synchronizeLifecycleStatus(getEventOrThrow(eventId));
        return toWizardDetailDto(event);
    }

    @Transactional
    public EventWizardDetailDto createEventWizard(EventWizardRequest request) {
        EventDraftSnapshot snapshot = sanitizeWizardRequest(request);
        if (snapshot.name().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Event name is required");
        }
        if (snapshot.semester().isBlank() || snapshot.year() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Semester is required");
        }

        String semester = normalizeSemester(snapshot.semester());
        ensureSemesterYearUnique(snapshot.year(), semester, null);

        HackathonEventEntity event = new HackathonEventEntity();
        applyWizardSnapshot(event, snapshot, semester);
        event.setStatus(EventStatus.DRAFT.getDbValue());
        event.setPublishedAt(null);
        HackathonEventEntity savedEvent = eventRepository.save(event);

        syncWizardTracks(savedEvent.getEventId(), snapshot.tracks());
        syncWizardRounds(savedEvent.getEventId(), snapshot.qualifyingRounds(), snapshot.finalRound());
        auditLogService.record(
                "EVENT_CREATED",
                "EVENT",
                savedEvent.getEventId(),
                savedEvent.getName(),
                null,
                toEventAuditPayload(savedEvent),
                "Coordinator created a draft event"
        );

        return toWizardDetailDto(savedEvent);
    }

    @Transactional
    public EventWizardDetailDto updateEventWizard(Integer eventId, EventWizardRequest request) {
        HackathonEventEntity event = getEventOrThrow(eventId);
        ensureDraftEditable(event);
        Map<String, Object> previous = toEventAuditPayload(event);

        EventDraftSnapshot snapshot = sanitizeWizardRequest(request);
        if (snapshot.name().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Event name is required");
        }
        if (snapshot.semester().isBlank() || snapshot.year() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Semester is required");
        }

        String semester = normalizeSemester(snapshot.semester());
        ensureSemesterYearUnique(snapshot.year(), semester, eventId);

        applyWizardSnapshot(event, snapshot, semester);
        eventRepository.save(event);
        syncWizardTracks(eventId, snapshot.tracks());
        syncWizardRounds(eventId, snapshot.qualifyingRounds(), snapshot.finalRound());
        auditLogService.record(
                "EVENT_UPDATED",
                "EVENT",
                event.getEventId(),
                event.getName(),
                previous,
                toEventAuditPayload(event),
                "Coordinator updated draft event information"
        );

        return toWizardDetailDto(event);
    }

    @Transactional
    public EventWizardDetailDto publishEvent(Integer eventId) {
        HackathonEventEntity event = getEventOrThrow(eventId);
        ensureDraftEditable(event);
        Map<String, Object> previous = toEventAuditPayload(event);

        List<TrackEntity> tracks = trackRepository.findByEventIdOrderByTrackIdAsc(eventId);
        List<RoundEntity> rounds = roundRepository.findByEventIdOrderByRoundOrderAsc(eventId);
        validatePublishableEvent(event, tracks, rounds);

        EventStatus publishedStatus = event.getCompetitionEndAt() != null
                && !event.getCompetitionEndAt().isAfter(LocalDateTime.now())
                ? EventStatus.ENDED
                : EventStatus.ONGOING;
        event.setStatus(publishedStatus.getDbValue());
        event.setPublishedAt(LocalDateTime.now());
        eventRepository.saveAndFlush(event);
        auditLogService.record(
                "EVENT_PUBLISHED",
                "EVENT",
                event.getEventId(),
                event.getName(),
                previous,
                toEventAuditPayload(event),
                "Coordinator published the event configuration"
        );

        return toWizardDetailDto(event);
    }

    @Transactional
    public EventManagementDto createEvent(EventUpsertRequest request) {
        validateEventDateRange(request.startDate(), request.endDate());
        String semester = normalizeSemester(request.semester());
        ensureSemesterYearUnique(request.year(), semester, null);
        HackathonEventEntity event = new HackathonEventEntity();
        applyEventRequest(event, request, semester, true);
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
        String semester = normalizeSemester(request.semester());
        ensureSemesterYearUnique(request.year(), semester, eventId);
        validateExistingRoundDeadlines(eventId, request.startDate(), request.endDate());
        applyEventRequest(event, request, semester, false);
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
        String semester = normalizeSemester(request.event().semester());
        ensureSemesterYearUnique(request.event().year(), semester, eventId);
        applyEventRequestWithoutConfiguredReadiness(event, request.event(), semester);
        eventRepository.save(event);

        syncTracks(eventId, request.tracks());
        syncRounds(eventId, request.rounds());

        return toEventDto(event);
    }

    @Transactional
    public void deleteEvent(Integer eventId) {
        HackathonEventEntity event = getEventOrThrow(eventId);
        if (teamRepository.countByEventId(eventId) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "Event cannot be deleted after teams have registered");
        }
        Map<String, Object> previous = toEventAuditPayload(event);
        eventRepository.deleteById(eventId);
        auditLogService.record(
                "EVENT_DELETED",
                "EVENT",
                eventId,
                event.getName(),
                previous,
                null,
                "Coordinator deleted an event without participants"
        );
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
        HackathonEventEntity event = getEventOrThrow(eventId);
        String trackName = request.name().trim();
        if (trackRepository.existsByEventIdAndNameIgnoreCase(eventId, trackName)) {
            throw new ApiException(HttpStatus.CONFLICT, "Track name already exists in this event");
        }

        TrackEntity track = new TrackEntity();
        track.setEventId(eventId);
        track.setName(trackName);
        TrackDto dto = toTrackDto(trackRepository.save(track));
        auditLogService.record(
                "TRACK_CREATED",
                "TRACK",
                dto.trackId(),
                dto.name(),
                null,
                dto,
                "Coordinator created a track for event " + event.getName()
        );
        return dto;
    }

    @Transactional
    public TrackDto updateTrack(Integer trackId, TrackUpsertRequest request) {
        TrackEntity track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Track not found"));
        TrackDto previous = toTrackDto(track);

        String nextName = request.name().trim();
        if (!track.getName().equalsIgnoreCase(nextName)
                && trackRepository.existsByEventIdAndNameIgnoreCase(track.getEventId(), nextName)) {
            throw new ApiException(HttpStatus.CONFLICT, "Track name already exists in this event");
        }
        track.setName(nextName);
        TrackDto updated = toTrackDto(trackRepository.save(track));
        auditLogService.record(
                "TRACK_UPDATED",
                "TRACK",
                updated.trackId(),
                updated.name(),
                previous,
                updated,
                "Coordinator updated a track"
        );
        return updated;
    }

    @Transactional
    public void deleteTrack(Integer trackId) {
        TrackEntity track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Track not found"));
        if (trackRepository.countByEventId(track.getEventId()) <= 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Each event must keep at least one track");
        }
        requireTrackHasNoTeams(track.getTrackId());
        TrackDto previous = toTrackDto(track);
        trackRepository.deleteById(trackId);
        auditLogService.record(
                "TRACK_DELETED",
                "TRACK",
                trackId,
                track.getName(),
                previous,
                null,
                "Coordinator deleted an unused track"
        );
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
        RoundManagementDto dto = toRoundDto(roundRepository.save(round));
        auditLogService.record(
                "ROUND_CREATED",
                "ROUND",
                dto.roundId(),
                dto.roundName(),
                null,
                dto,
                "Coordinator created a round for event " + event.getName()
        );
        return dto;
    }

    @Transactional
    public RoundManagementDto updateRound(Integer roundId, RoundUpsertRequest request) {
        RoundEntity round = roundRepository.findById(roundId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round not found"));
        HackathonEventEntity event = getEventOrThrow(round.getEventId());
        RoundManagementDto previous = toRoundDto(round);
        validateRoundValues(request);
        validateSubmissionDeadlineWithinEvent(event.getStartDate(), event.getEndDate(), request.submissionDeadline());
        List<RoundEntity> roundsInEvent = roundRepository.findByEventIdOrderByRoundOrderAsc(round.getEventId());
        validateRoundInsertPosition(request.roundOrder(), roundsInEvent.size());
        reorderRoundsForMove(roundsInEvent, roundId, request.roundOrder());
        applyRoundRequest(round, request);
        RoundManagementDto updated = toRoundDto(roundRepository.save(round));
        auditLogService.record(
                "ROUND_UPDATED",
                "ROUND",
                updated.roundId(),
                updated.roundName(),
                previous,
                updated,
                "Coordinator updated round settings for event " + event.getName()
        );
        return updated;
    }

    @Transactional
    public RoundManagementDto updateRoundScoreLock(Integer roundId, Boolean scoreLocked) {
        if (scoreLocked == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "scoreLocked is required");
        }
        RoundEntity round = roundRepository.findById(roundId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round not found"));
        Boolean previous = round.getScoreLocked();
        round.setScoreLocked(scoreLocked);
        RoundManagementDto updated = toRoundDto(roundRepository.save(round));
        auditLogService.record(
                Boolean.TRUE.equals(scoreLocked) ? "ROUND_SUBMISSION_CLOSED" : "ROUND_SUBMISSION_OPENED",
                "ROUND",
                updated.roundId(),
                updated.roundName(),
                previous,
                updated.scoreLocked(),
                Boolean.TRUE.equals(scoreLocked)
                        ? "Coordinator closed the round for further scoring updates"
                        : "Coordinator reopened the round for scoring updates"
        );
        return updated;
    }

    @Transactional
    public void deleteRound(Integer roundId) {
        RoundEntity round = roundRepository.findById(roundId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Round not found"));
        if (roundRepository.countByEventId(round.getEventId()) <= 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Each event must keep at least one round");
        }
        Integer removedOrder = round.getRoundOrder();
        RoundManagementDto previous = toRoundDto(round);
        roundRepository.deleteById(roundId);
        List<RoundEntity> remainingRounds = roundRepository.findByEventIdOrderByRoundOrderAsc(round.getEventId());
        for (RoundEntity remaining : remainingRounds) {
          if (remaining.getRoundOrder() > removedOrder) {
              remaining.setRoundOrder(remaining.getRoundOrder() - 1);
              roundRepository.save(remaining);
          }
        }
        auditLogService.record(
                "ROUND_DELETED",
                "ROUND",
                roundId,
                round.getRoundName(),
                previous,
                null,
                "Coordinator deleted a round"
        );
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
            requireTrackHasNoTeams(track.getTrackId());
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
                round.setScoreLocked(false);
            }

            round.setRoundName(request.roundName().trim());
            round.setRoundOrder(request.roundOrder());
            round.setSubmissionDeadline(request.submissionDeadline());
            round.setPromotionRuleTopN(request.promotionRuleTopN());
            if (round.getScoreLocked() == null) {
                round.setScoreLocked(false);
            }
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
                                   String semester,
                                   boolean creating) {
        EventStatus nextStatus = EventStatus.from(request.status());
        if (creating && nextStatus != EventStatus.DRAFT) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "New event must start in Draft status");
        }
        if (!creating) {
            validateStatusTransition(event, nextStatus);
        }

        event.setName(request.name().trim());
        event.setSemester(semester);
        event.setYear(request.year());
        event.setStartDate(request.startDate());
        event.setEndDate(request.endDate());
        event.setStatus(nextStatus.getDbValue());
        event.setDescription(request.description() == null ? null : request.description().trim());
    }

    private void applyEventRequestWithoutConfiguredReadiness(HackathonEventEntity event,
                                                             EventUpsertRequest request,
                                                             String semester) {
        EventStatus nextStatus = EventStatus.from(request.status());
        validateStatusTransition(event, nextStatus);

        event.setName(request.name().trim());
        event.setSemester(semester);
        event.setYear(request.year());
        event.setStartDate(request.startDate());
        event.setEndDate(request.endDate());
        event.setStatus(nextStatus.getDbValue());
        event.setDescription(request.description() == null ? null : request.description().trim());
    }

    private String normalizeSemester(String rawSemester) {
        String normalizedSemesterKey = rawSemester.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_SEMESTERS.containsKey(normalizedSemesterKey)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "semester must be one of: Spring, Summer, Fall");
        }
        return ALLOWED_SEMESTERS.get(normalizedSemesterKey);
    }

    private void ensureSemesterYearUnique(Integer year, String semester, Integer currentEventId) {
        boolean exists = currentEventId == null
                ? eventRepository.existsByYearAndSemesterIgnoreCase(year, semester)
                : eventRepository.existsByYearAndSemesterIgnoreCaseAndEventIdNot(year, semester, currentEventId);
        if (exists) {
            throw new ApiException(HttpStatus.CONFLICT, "An event for this semester and year already exists");
        }
    }

    private void validateStatusTransition(HackathonEventEntity event, EventStatus nextStatus) {
        EventStatus currentStatus = safeStatus(event.getStatus());
        if (currentStatus == nextStatus) {
            return;
        }
        if (currentStatus.isTerminal()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Cannot change event status from " + currentStatus.getDbValue() + " to " + nextStatus.getDbValue());
        }
        if (currentStatus == EventStatus.DRAFT && nextStatus == EventStatus.ONGOING) {
            validateTeamsReadyForEvent(event.getEventId());
            return;
        }
        if (currentStatus == EventStatus.ONGOING && nextStatus == EventStatus.ENDED) {
            return;
        }
        throw new ApiException(HttpStatus.BAD_REQUEST,
                "Cannot change event status from " + currentStatus.getDbValue() + " to " + nextStatus.getDbValue());
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

    private void validateTeamsReadyForEvent(Integer eventId) {
        long invalidTeams = teamRepository.countInvalidTeamSizesByEventId(eventId, MIN_TEAM_SIZE, MAX_TEAM_SIZE);
        if (invalidTeams > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "All teams must have 3 to 5 members before the event can start");
        }
    }

    private void requireTrackHasNoTeams(Integer trackId) {
        if (teamRepository.countByTrackTrackId(trackId) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "Track cannot be deleted after teams have registered");
        }
    }

    private void ensureDraftEditable(HackathonEventEntity event) {
        EventStatus status = safeStatus(event.getStatus());
        if (status != EventStatus.DRAFT) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Published events are locked and cannot be edited");
        }
    }

    private HackathonEventEntity synchronizeLifecycleStatus(HackathonEventEntity event) {
        EventStatus currentStatus = safeStatus(event.getStatus());
        EventStatus resolvedStatus = resolveLifecycleStatus(event);
        if (resolvedStatus != currentStatus) {
            event.setStatus(resolvedStatus.getDbValue());
            eventRepository.save(event);
        }
        return event;
    }

    private EventStatus resolveLifecycleStatus(HackathonEventEntity event) {
        EventStatus currentStatus = safeStatus(event.getStatus());
        if (currentStatus == EventStatus.DRAFT) {
            return EventStatus.DRAFT;
        }
        if (event.getCompetitionEndAt() != null && !event.getCompetitionEndAt().isAfter(LocalDateTime.now())) {
            return EventStatus.ENDED;
        }
        return EventStatus.ONGOING;
    }

    private EventDraftSnapshot sanitizeWizardRequest(EventWizardRequest request) {
        List<EventWizardTrackRequest> sanitizedTracks = request == null || request.tracks() == null
                ? Collections.emptyList()
                : request.tracks().stream()
                .filter(track -> track != null && track.name() != null && !track.name().trim().isBlank())
                .map(track -> new EventWizardTrackRequest(track.trackId(), track.name().trim()))
                .toList();

        List<EventWizardRoundRequest> sanitizedQualifyingRounds = request == null || request.qualifyingRounds() == null
                ? Collections.emptyList()
                : request.qualifyingRounds().stream()
                .filter(round -> round != null
                        && round.roundName() != null
                        && !round.roundName().trim().isBlank())
                .map(round -> new EventWizardRoundRequest(
                        round.roundId(),
                        round.roundName().trim(),
                        round.roundOrder(),
                        round.submissionDeadline(),
                        round.promotionRuleTopN(),
                        false,
                        sanitizeRoundCriteria(round.criteria())
                ))
                .toList();

        EventWizardRoundRequest sanitizedFinalRound = request == null || request.finalRound() == null
                || request.finalRound().roundName() == null
                || request.finalRound().roundName().trim().isBlank()
                ? null
                : new EventWizardRoundRequest(
                        request.finalRound().roundId(),
                        normalizeFinalRoundName(request.finalRound().roundName()),
                        request.finalRound().roundOrder(),
                        request.finalRound().submissionDeadline(),
                        null,
                        true,
                        sanitizeRoundCriteria(request.finalRound().criteria())
                );

        List<EventWizardAwardRequest> sanitizedAwards = request == null || request.awards() == null
                ? Collections.emptyList()
                : request.awards().stream()
                .filter(award -> award != null && award.awardName() != null && !award.awardName().trim().isBlank())
                .map(award -> new EventWizardAwardRequest(award.awardName().trim(), award.quantity()))
                .toList();

        return new EventDraftSnapshot(
                request == null || request.name() == null ? "" : request.name().trim(),
                request == null || request.semester() == null ? "" : request.semester().trim(),
                request == null ? null : request.year(),
                request == null || request.description() == null ? null : request.description().trim(),
                request == null ? null : request.registrationStartAt(),
                request == null ? null : request.registrationEndAt(),
                request == null ? null : request.competitionStartAt(),
                request == null ? null : request.competitionEndAt(),
                request == null || request.trackSelectionMode() == null ? "TEAM_SELECT" : request.trackSelectionMode().trim(),
                sanitizedTracks,
                sanitizedQualifyingRounds,
                sanitizedFinalRound,
                request == null || request.rankingMethod() == null ? "SCORE_BASED" : request.rankingMethod().trim(),
                sanitizedAwards
        );
    }

    private void applyWizardSnapshot(HackathonEventEntity event, EventDraftSnapshot snapshot, String semester) {
        event.setName(snapshot.name());
        event.setSemester(semester);
        event.setYear(snapshot.year());
        event.setDescription(snapshot.description());
        event.setRegistrationStartAt(snapshot.registrationStartAt());
        event.setRegistrationEndAt(snapshot.registrationEndAt());
        event.setCompetitionStartAt(snapshot.competitionStartAt());
        event.setCompetitionEndAt(snapshot.competitionEndAt());
        event.setTrackSelectionMode(snapshot.trackSelectionMode());
        event.setRankingMethod(snapshot.rankingMethod());
        event.setAwardsJson(writeAwards(snapshot.awards()));
        event.setScoringCriteriaJson(null);
        event.setStartDate(snapshot.competitionStartAt() == null ? null : snapshot.competitionStartAt().toLocalDate());
        event.setEndDate(snapshot.competitionEndAt() == null ? null : snapshot.competitionEndAt().toLocalDate());
    }

    private void syncWizardTracks(Integer eventId, List<EventWizardTrackRequest> requests) {
        List<TrackEntity> existingTracks = trackRepository.findByEventIdOrderByTrackIdAsc(eventId);
        Map<Integer, TrackEntity> existingById = existingTracks.stream()
                .collect(java.util.stream.Collectors.toMap(TrackEntity::getTrackId, track -> track));
        Set<Integer> requestedIds = new HashSet<>();
        Set<String> uniqueNames = new HashSet<>();

        for (EventWizardTrackRequest request : requests) {
            String normalized = request.name().trim().toLowerCase(Locale.ROOT);
            if (!uniqueNames.add(normalized)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Track names must be unique");
            }

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
                TrackEntity savedTrack = trackRepository.save(created);
                requestedIds.add(savedTrack.getTrackId());
            }
        }

        for (TrackEntity existing : existingTracks) {
            if (!requestedIds.contains(existing.getTrackId())) {
                requireTrackHasNoTeams(existing.getTrackId());
                trackRepository.delete(existing);
            }
        }
        trackRepository.flush();
    }

    private void syncWizardRounds(Integer eventId,
                                  List<EventWizardRoundRequest> qualifyingRounds,
                                  EventWizardRoundRequest finalRound) {
        List<EventWizardRoundRequest> desiredRounds = new ArrayList<>();
        int order = 1;
        for (EventWizardRoundRequest qualifyingRound : qualifyingRounds) {
            desiredRounds.add(new EventWizardRoundRequest(
                    qualifyingRound.roundId(),
                    qualifyingRound.roundName(),
                    order++,
                    qualifyingRound.submissionDeadline(),
                    qualifyingRound.promotionRuleTopN(),
                    false,
                    qualifyingRound.criteria()
            ));
        }
        if (finalRound != null) {
            desiredRounds.add(new EventWizardRoundRequest(
                    finalRound.roundId(),
                    normalizeFinalRoundName(finalRound.roundName()),
                    order,
                    finalRound.submissionDeadline(),
                    null,
                    true,
                    finalRound.criteria()
            ));
        }

        List<RoundEntity> existingRounds = roundRepository.findByEventIdOrderByRoundOrderAsc(eventId);
        Map<Integer, RoundEntity> existingById = existingRounds.stream()
                .collect(java.util.stream.Collectors.toMap(RoundEntity::getRoundId, round -> round));
        Set<Integer> requestedIds = new HashSet<>();

        int tempOrder = desiredRounds.size() + existingRounds.size() + 10;
        for (RoundEntity existing : existingRounds) {
            existing.setRoundOrder(tempOrder++);
            roundRepository.save(existing);
        }
        if (!existingRounds.isEmpty()) {
            roundRepository.flush();
        }

        for (EventWizardRoundRequest request : desiredRounds) {
            RoundEntity round = request.roundId() == null ? null : existingById.get(request.roundId());
            if (round == null) {
                round = new RoundEntity();
                round.setEventId(eventId);
                round.setScoreLocked(false);
            } else {
                requestedIds.add(round.getRoundId());
            }

            round.setRoundName(request.roundName());
            round.setRoundOrder(request.roundOrder());
            round.setStartAt(request.submissionDeadline());
            round.setEndAt(request.submissionDeadline());
            round.setSubmissionDeadline(request.submissionDeadline());
            round.setPromotionRuleTopN(Boolean.TRUE.equals(request.finalRound()) ? null : request.promotionRuleTopN());
            round.setFinalRound(Boolean.TRUE.equals(request.finalRound()));
            if (round.getScoreLocked() == null) {
                round.setScoreLocked(false);
            }
            roundRepository.save(round);
            syncRoundCriteria(round, request.criteria());
        }
        roundRepository.flush();

        for (RoundEntity existing : existingRounds) {
            if (!requestedIds.contains(existing.getRoundId())) {
                scoringCriteriaRepository.deleteByRoundId(existing.getRoundId());
                roundRepository.delete(existing);
            }
        }
        roundRepository.flush();
    }

    private void validatePublishableEvent(HackathonEventEntity event,
                                          List<TrackEntity> tracks,
                                          List<RoundEntity> rounds) {
        if (event.getName() == null || event.getName().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Event name is required");
        }
        if (event.getSemester() == null || event.getYear() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Semester is required");
        }
        if (event.getRegistrationStartAt() == null || event.getRegistrationEndAt() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Registration dates are required");
        }
        if (event.getCompetitionStartAt() == null || event.getCompetitionEndAt() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Competition dates are required");
        }
        if (event.getRegistrationEndAt().isBefore(event.getRegistrationStartAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Registration end must be after registration start");
        }
        if (event.getCompetitionEndAt().isBefore(event.getCompetitionStartAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Competition end must be after competition start");
        }
        if (event.getCompetitionStartAt().isBefore(event.getRegistrationEndAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Competition must start after registration ends");
        }

        validateEventDateInSemester(event.getSemester(), event.getYear(), event.getRegistrationStartAt(), "Registration start");
        validateEventDateInSemester(event.getSemester(), event.getYear(), event.getRegistrationEndAt(), "Registration end");
        validateEventDateInSemester(event.getSemester(), event.getYear(), event.getCompetitionStartAt(), "Competition start");
        validateEventDateInSemester(event.getSemester(), event.getYear(), event.getCompetitionEndAt(), "Competition end");

        if (tracks.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one track is required");
        }

        if (rounds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one round is required");
        }

        List<RoundEntity> orderedRounds = rounds.stream()
                .sorted(Comparator.comparing(RoundEntity::getRoundOrder))
                .toList();

        long finalRoundCount = orderedRounds.stream().filter(round -> Boolean.TRUE.equals(round.getFinalRound())).count();
        if (finalRoundCount != 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Exactly one final round is required");
        }

        RoundEntity lastRound = orderedRounds.get(orderedRounds.size() - 1);
        if (!Boolean.TRUE.equals(lastRound.getFinalRound())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "The final round must be the last round");
        }

        int expectedOrder = 1;
        LocalDateTime previousSubmissionDeadline = null;
        for (RoundEntity round : orderedRounds) {
            if (round.getRoundOrder() == null || round.getRoundOrder() != expectedOrder) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Round order must stay consecutive from 1");
            }
            if (round.getRoundName() == null || round.getRoundName().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Every round must have a name");
            }
            if (round.getSubmissionDeadline() == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Every round needs a submission deadline");
            }
            if (round.getSubmissionDeadline().isBefore(event.getCompetitionStartAt())
                    || round.getSubmissionDeadline().isAfter(event.getCompetitionEndAt())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Round submission deadlines must stay inside the competition window");
            }
            if (previousSubmissionDeadline != null && !round.getSubmissionDeadline().isAfter(previousSubmissionDeadline)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Each next round must have a submission deadline after the previous round");
            }
            if (!Boolean.TRUE.equals(round.getFinalRound())
                    && (round.getPromotionRuleTopN() == null || round.getPromotionRuleTopN() < 1)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Each qualifying round needs a Top N value");
            }
            if (scoringCriteriaRepository.findByRoundIdOrderByCriteriaId(round.getRoundId()).isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Each round needs at least one scoring criterion");
            }
            previousSubmissionDeadline = round.getSubmissionDeadline();
            expectedOrder += 1;
        }

        List<EventWizardAwardRequest> awards = readAwards(event.getAwardsJson());
        if (awards.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one award is required");
        }
        for (EventWizardAwardRequest award : awards) {
            if (award.awardName() == null || award.awardName().isBlank() || award.quantity() == null || award.quantity() < 1) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Each award needs a name and quantity greater than 0");
            }
        }

    }

    private void validateEventDateInSemester(String semester, Integer year, LocalDateTime value, String label) {
        if (semester == null || year == null || value == null) {
            return;
        }
        LocalDate startBoundary;
        LocalDate endBoundary;
        switch (semester) {
            case "Spring" -> {
                startBoundary = LocalDate.of(year, Month.JANUARY, 1);
                endBoundary = LocalDate.of(year, Month.APRIL, 30);
            }
            case "Summer" -> {
                startBoundary = LocalDate.of(year, Month.MAY, 1);
                endBoundary = LocalDate.of(year, Month.AUGUST, 31);
            }
            case "Fall" -> {
                startBoundary = LocalDate.of(year, Month.SEPTEMBER, 1);
                endBoundary = LocalDate.of(year, Month.DECEMBER, 31);
            }
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Semester must be Spring, Summer, or Fall");
        }

        LocalDate valueDate = value.toLocalDate();
        if (valueDate.isBefore(startBoundary) || valueDate.isAfter(endBoundary)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    label + " must stay inside " + semester + " " + year
            );
        }
    }

    private String writeAwards(List<EventWizardAwardRequest> awards) {
        if (awards == null || awards.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(awards);
        } catch (JsonProcessingException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save awards configuration");
        }
    }

    private List<EventWizardAwardRequest> readAwards(String rawAwards) {
        if (rawAwards == null || rawAwards.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(rawAwards, new TypeReference<List<EventWizardAwardRequest>>() {});
        } catch (JsonProcessingException exception) {
            return Collections.emptyList();
        }
    }

    private List<EventWizardCriterionRequest> sanitizeRoundCriteria(List<EventWizardCriterionRequest> criteria) {
        if (criteria == null) {
            return Collections.emptyList();
        }
        List<EventWizardCriterionRequest> sanitized = criteria.stream()
                .filter(item -> item != null && item.criterionName() != null && !item.criterionName().trim().isBlank())
                .map(item -> new EventWizardCriterionRequest(
                        item.criterionName().trim(),
                        item.description() == null ? null : item.description().trim(),
                        item.weight()
                ))
                .toList();
        int totalWeight = sanitized.stream().mapToInt(item -> item.weight() == null ? 0 : item.weight()).sum();
        for (EventWizardCriterionRequest criterion : sanitized) {
            if (criterion.weight() == null || criterion.weight() < 1) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Each scoring criterion needs weight greater than 0");
            }
        }
        if (!sanitized.isEmpty() && totalWeight != 100) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Scoring criteria weights must total 100");
        }
        return sanitized;
    }

    private List<EventWizardCriterionRequest> readCriteriaForRound(Integer roundId) {
        if (roundId == null) {
            return Collections.emptyList();
        }
        return scoringCriteriaRepository.findByRoundIdOrderByCriteriaId(roundId).stream()
                .map(criteria -> new EventWizardCriterionRequest(
                        criteria.getCriteriaName(),
                        criteria.getCriteriaType(),
                        criteria.getWeight() == null ? null : criteria.getWeight().intValue()
                ))
                .toList();
    }

    private void syncRoundCriteria(RoundEntity round, List<EventWizardCriterionRequest> criteria) {
        if (round.getRoundId() == null) {
            return;
        }
        List<EventWizardCriterionRequest> sanitizedCriteria = sanitizeRoundCriteria(criteria);
        scoringCriteriaRepository.deleteByRoundId(round.getRoundId());
        if (sanitizedCriteria.isEmpty()) {
            return;
        }
        List<ScoringCriteriaEntity> entities = new ArrayList<>();
        for (EventWizardCriterionRequest criterion : sanitizedCriteria) {
            ScoringCriteriaEntity entity = new ScoringCriteriaEntity();
            entity.setRoundId(round.getRoundId());
            entity.setCriteriaName(criterion.criterionName().trim());
            entity.setCriteriaType(criterion.criterionName().trim());
            entity.setWeight(BigDecimal.valueOf(criterion.weight()));
            entities.add(entity);
        }
        scoringCriteriaRepository.saveAll(entities);
    }

    private String normalizeFinalRoundName(String roundName) {
        if (roundName == null || roundName.trim().isBlank()) {
            return "Final";
        }
        return "Grand Final".equalsIgnoreCase(roundName.trim()) ? "Final" : roundName.trim();
    }

    private void applyRoundRequest(RoundEntity round, RoundUpsertRequest request) {
        round.setRoundName(request.roundName().trim());
        round.setRoundOrder(request.roundOrder());
        round.setSubmissionDeadline(request.submissionDeadline());
        round.setPromotionRuleTopN(request.promotionRuleTopN());
        round.setFinalRound(false);
        round.setStartAt(request.submissionDeadline());
        round.setEndAt(request.submissionDeadline());
        if (round.getScoreLocked() == null) {
            round.setScoreLocked(false);
        }
    }

    private EventManagementDto toEventDto(HackathonEventEntity event) {
        int trackCount = trackRepository.findByEventIdOrderByTrackIdAsc(event.getEventId()).size();
        int roundCount = roundRepository.findByEventIdOrderByRoundOrderAsc(event.getEventId()).size();
        boolean canDelete = teamRepository.countByEventId(event.getEventId()) == 0;
        EventStatus normalizedStatus = safeStatus(event.getStatus());
        return new EventManagementDto(
                event.getEventId(),
                event.getName(),
                event.getSemester(),
                event.getYear(),
                event.getStartDate(),
                event.getEndDate(),
                normalizedStatus.getDbValue(),
                event.getDescription(),
                event.getRegistrationStartAt(),
                event.getRegistrationEndAt(),
                event.getCompetitionStartAt(),
                event.getCompetitionEndAt(),
                event.getTrackSelectionMode(),
                event.getRankingMethod(),
                trackCount,
                roundCount,
                canDelete,
                normalizedStatus != EventStatus.DRAFT
        );
    }

    private EventWizardDetailDto toWizardDetailDto(HackathonEventEntity event) {
        List<TrackEntity> tracks = trackRepository.findByEventIdOrderByTrackIdAsc(event.getEventId());
        List<RoundEntity> rounds = roundRepository.findByEventIdOrderByRoundOrderAsc(event.getEventId());
        List<EventWizardRoundRequest> qualifyingRounds = rounds.stream()
                .filter(round -> !Boolean.TRUE.equals(round.getFinalRound()))
                .sorted(Comparator.comparing(RoundEntity::getRoundOrder))
                .map(round -> new EventWizardRoundRequest(
                        round.getRoundId(),
                        round.getRoundName(),
                        round.getRoundOrder(),
                        round.getSubmissionDeadline(),
                        round.getPromotionRuleTopN(),
                        false,
                        readCriteriaForRound(round.getRoundId())
                ))
                .toList();
        EventWizardRoundRequest finalRound = rounds.stream()
                .filter(round -> Boolean.TRUE.equals(round.getFinalRound()))
                .findFirst()
                .map(round -> new EventWizardRoundRequest(
                        round.getRoundId(),
                        normalizeFinalRoundName(round.getRoundName()),
                        round.getRoundOrder(),
                        round.getSubmissionDeadline(),
                        null,
                        true,
                        readCriteriaForRound(round.getRoundId())
                ))
                .orElse(null);

        boolean hasParticipants = teamRepository.countByEventId(event.getEventId()) > 0;
        EventStatus normalizedStatus = safeStatus(event.getStatus());
        return new EventWizardDetailDto(
                event.getEventId(),
                event.getName(),
                event.getSemester(),
                event.getYear(),
                normalizedStatus.getDbValue(),
                event.getDescription(),
                event.getRegistrationStartAt(),
                event.getRegistrationEndAt(),
                event.getCompetitionStartAt(),
                event.getCompetitionEndAt(),
                event.getTrackSelectionMode(),
                tracks.stream()
                        .map(track -> new EventWizardTrackRequest(track.getTrackId(), track.getName()))
                        .toList(),
                qualifyingRounds,
                finalRound,
                event.getRankingMethod(),
                readAwards(event.getAwardsJson()),
                Collections.emptyList(),
                normalizedStatus != EventStatus.DRAFT,
                normalizedStatus == EventStatus.DRAFT,
                !hasParticipants,
                hasParticipants
        );
    }

    private EventStatus safeStatus(String rawStatus) {
        try {
            return EventStatus.from(rawStatus);
        } catch (RuntimeException exception) {
            return EventStatus.DRAFT;
        }
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
                round.getPromotionRuleTopN(),
                Boolean.TRUE.equals(round.getScoreLocked())
        );
    }

    private Map<String, Object> toEventAuditPayload(HackathonEventEntity event) {
        Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("eventId", event.getEventId());
        payload.put("name", event.getName());
        payload.put("semester", event.getSemester());
        payload.put("year", event.getYear());
        payload.put("status", event.getStatus());
        payload.put("description", event.getDescription());
        payload.put("registrationStartAt", event.getRegistrationStartAt());
        payload.put("registrationEndAt", event.getRegistrationEndAt());
        payload.put("competitionStartAt", event.getCompetitionStartAt());
        payload.put("competitionEndAt", event.getCompetitionEndAt());
        payload.put("trackSelectionMode", event.getTrackSelectionMode());
        payload.put("rankingMethod", event.getRankingMethod());
        payload.put("publishedAt", event.getPublishedAt());
        return payload;
    }

    private record EventDraftSnapshot(
            String name,
            String semester,
            Integer year,
            String description,
            LocalDateTime registrationStartAt,
            LocalDateTime registrationEndAt,
            LocalDateTime competitionStartAt,
            LocalDateTime competitionEndAt,
            String trackSelectionMode,
            List<EventWizardTrackRequest> tracks,
            List<EventWizardRoundRequest> qualifyingRounds,
            EventWizardRoundRequest finalRound,
            String rankingMethod,
            List<EventWizardAwardRequest> awards
    ) {
    }
}
