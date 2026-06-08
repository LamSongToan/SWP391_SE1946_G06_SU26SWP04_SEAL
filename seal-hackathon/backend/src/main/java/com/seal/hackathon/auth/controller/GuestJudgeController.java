package com.seal.hackathon.auth.controller;

import com.seal.hackathon.auth.dto.CreateGuestJudgeRequest;
import com.seal.hackathon.auth.dto.GuestJudgeDto;
import com.seal.hackathon.auth.service.GuestJudgeService;
import com.seal.hackathon.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/coordinator/judges")
@PreAuthorize("hasRole('COORDINATOR')")
public class GuestJudgeController {

    private final GuestJudgeService service;

    public GuestJudgeController(GuestJudgeService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<GuestJudgeDto>>> list() {
        return ResponseEntity.ok(ApiResponse.ok("Judges fetched", service.listJudges()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<GuestJudgeDto>> create(@Valid @RequestBody CreateGuestJudgeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Guest judge created", service.createGuestJudge(request)));
    }

    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<ApiResponse<GuestJudgeDto>> resetPassword(@PathVariable Integer userId) {
        return ResponseEntity.ok(ApiResponse.ok("Password reset", service.resetPassword(userId)));
    }

    @PostMapping("/{userId}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Integer userId) {
        service.deactivateJudge(userId);
        return ResponseEntity.ok(ApiResponse.ok("Judge deactivated", null));
    }
}