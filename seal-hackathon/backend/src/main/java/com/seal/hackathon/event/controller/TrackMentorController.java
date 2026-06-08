package com.seal.hackathon.event.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.event.dto.AssignTrackMentorRequest;
import com.seal.hackathon.event.dto.TrackMentorDto;
import com.seal.hackathon.event.service.TrackMentorService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class TrackMentorController {

    private final TrackMentorService service;

    public TrackMentorController(TrackMentorService service) {
        this.service = service;
    }

    @GetMapping("/tracks/{trackId}/mentors")
    @PreAuthorize("hasAnyRole('COORDINATOR','MENTOR','STUDENT')")
    public ResponseEntity<ApiResponse<List<TrackMentorDto>>> listByTrack(@PathVariable Integer trackId) {
        return ResponseEntity.ok(ApiResponse.ok("Track mentors fetched", service.listByTrack(trackId)));
    }

    @PostMapping("/coordinator/track-mentors")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<ApiResponse<TrackMentorDto>> assign(@Valid @RequestBody AssignTrackMentorRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Mentor assigned to track", service.assign(request)));
    }

    @DeleteMapping("/coordinator/track-mentors/{trackMentorId}")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<ApiResponse<Void>> remove(@PathVariable Integer trackMentorId) {
        service.remove(trackMentorId);
        return ResponseEntity.ok(ApiResponse.ok("Assignment removed", null));
    }

    @GetMapping("/mentor/tracks")
    @PreAuthorize("hasRole('MENTOR')")
    public ResponseEntity<ApiResponse<List<TrackMentorDto>>> myTracks(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok("My tracks fetched", service.listMyTracks(authentication)));
    }
}