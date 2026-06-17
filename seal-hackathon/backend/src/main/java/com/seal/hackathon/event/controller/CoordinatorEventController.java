package com.seal.hackathon.event.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.event.dto.EventManagementDto;
import com.seal.hackathon.event.dto.EventConfigurationUpdateRequest;
import com.seal.hackathon.event.dto.EventSetupCreateRequest;
import com.seal.hackathon.event.dto.EventUpsertRequest;
import com.seal.hackathon.event.dto.EventWizardDetailDto;
import com.seal.hackathon.event.dto.EventWizardRequest;
import com.seal.hackathon.event.dto.RoundManagementDto;
import com.seal.hackathon.event.dto.RoundScoreLockRequest;
import com.seal.hackathon.event.dto.RoundUpsertRequest;
import com.seal.hackathon.event.dto.TrackDto;
import com.seal.hackathon.event.dto.TrackUpsertRequest;
import com.seal.hackathon.event.service.EventManagementService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/coordinator")
@PreAuthorize("hasRole('COORDINATOR')")
public class CoordinatorEventController {

    private final EventManagementService eventManagementService;

    public CoordinatorEventController(EventManagementService eventManagementService) {
        this.eventManagementService = eventManagementService;
    }

    @GetMapping("/events")
    public ResponseEntity<ApiResponse<List<EventManagementDto>>> getEvents() {
        return ResponseEntity.ok(ApiResponse.ok("Events fetched", eventManagementService.listEvents()));
    }

    @GetMapping("/events/{eventId}/wizard")
    public ResponseEntity<ApiResponse<EventWizardDetailDto>> getEventWizard(@PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok("Event wizard fetched", eventManagementService.getEventWizard(eventId)));
    }

    @PostMapping("/events/wizard")
    public ResponseEntity<ApiResponse<EventWizardDetailDto>> createEventWizard(@RequestBody EventWizardRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Event draft saved", eventManagementService.createEventWizard(request)));
    }

    @PutMapping("/events/{eventId}/wizard")
    public ResponseEntity<ApiResponse<EventWizardDetailDto>> updateEventWizard(
            @PathVariable Integer eventId,
            @RequestBody EventWizardRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Event draft saved", eventManagementService.updateEventWizard(eventId, request)));
    }

    @PostMapping("/events/{eventId}/publish")
    public ResponseEntity<ApiResponse<EventWizardDetailDto>> publishEvent(@PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok("Event published", eventManagementService.publishEvent(eventId)));
    }

    @PostMapping("/events")
    public ResponseEntity<ApiResponse<EventManagementDto>> createEvent(@Valid @RequestBody EventUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Event created", eventManagementService.createEvent(request)));
    }

    @PostMapping("/events/setup")
    public ResponseEntity<ApiResponse<EventManagementDto>> createEventWithInitialConfiguration(
            @Valid @RequestBody EventSetupCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(
                        "Event created with initial configuration",
                        eventManagementService.createEventWithInitialConfiguration(request)
                ));
    }

    @PutMapping("/events/{eventId}")
    public ResponseEntity<ApiResponse<EventManagementDto>> updateEvent(
            @PathVariable Integer eventId,
            @Valid @RequestBody EventUpsertRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Event updated", eventManagementService.updateEvent(eventId, request)));
    }

    @PutMapping("/events/{eventId}/configuration")
    public ResponseEntity<ApiResponse<EventManagementDto>> updateEventConfiguration(
            @PathVariable Integer eventId,
            @Valid @RequestBody EventConfigurationUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Event configuration updated",
                eventManagementService.updateEventConfiguration(eventId, request)
        ));
    }

    @DeleteMapping("/events/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable Integer eventId) {
        eventManagementService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.ok("Event deleted", null));
    }

    @GetMapping("/events/{eventId}/tracks")
    public ResponseEntity<ApiResponse<List<TrackDto>>> getTracks(@PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok("Tracks fetched", eventManagementService.listTracks(eventId)));
    }

    @PostMapping("/events/{eventId}/tracks")
    public ResponseEntity<ApiResponse<TrackDto>> createTrack(
            @PathVariable Integer eventId,
            @Valid @RequestBody TrackUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Track created", eventManagementService.createTrack(eventId, request)));
    }

    @PutMapping("/tracks/{trackId}")
    public ResponseEntity<ApiResponse<TrackDto>> updateTrack(
            @PathVariable Integer trackId,
            @Valid @RequestBody TrackUpsertRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Track updated", eventManagementService.updateTrack(trackId, request)));
    }

    @DeleteMapping("/tracks/{trackId}")
    public ResponseEntity<ApiResponse<Void>> deleteTrack(@PathVariable Integer trackId) {
        eventManagementService.deleteTrack(trackId);
        return ResponseEntity.ok(ApiResponse.ok("Track deleted", null));
    }

    @GetMapping("/events/{eventId}/rounds")
    public ResponseEntity<ApiResponse<List<RoundManagementDto>>> getRounds(@PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok("Rounds fetched", eventManagementService.listRounds(eventId)));
    }

    @PostMapping("/events/{eventId}/rounds")
    public ResponseEntity<ApiResponse<RoundManagementDto>> createRound(
            @PathVariable Integer eventId,
            @Valid @RequestBody RoundUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Round created", eventManagementService.createRound(eventId, request)));
    }

    @PutMapping("/rounds/{roundId}")
    public ResponseEntity<ApiResponse<RoundManagementDto>> updateRound(
            @PathVariable Integer roundId,
            @Valid @RequestBody RoundUpsertRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Round updated", eventManagementService.updateRound(roundId, request)));
    }

    @PatchMapping("/rounds/{roundId}/score-lock")
    public ResponseEntity<ApiResponse<RoundManagementDto>> updateRoundScoreLock(
            @PathVariable Integer roundId,
            @Valid @RequestBody RoundScoreLockRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                Boolean.TRUE.equals(request.scoreLocked()) ? "Round scoring locked" : "Round scoring reopened",
                eventManagementService.updateRoundScoreLock(roundId, request.scoreLocked())
        ));
    }

    @DeleteMapping("/rounds/{roundId}")
    public ResponseEntity<ApiResponse<Void>> deleteRound(@PathVariable Integer roundId) {
        eventManagementService.deleteRound(roundId);
        return ResponseEntity.ok(ApiResponse.ok("Round deleted", null));
    }
}
