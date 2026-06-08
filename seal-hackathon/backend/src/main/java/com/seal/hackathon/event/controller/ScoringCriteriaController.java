package com.seal.hackathon.event.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.event.dto.ScoringCriteriaDto;
import com.seal.hackathon.event.dto.ScoringCriteriaRequest;
import com.seal.hackathon.event.service.ScoringCriteriaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ScoringCriteriaController {

    private final ScoringCriteriaService service;

    public ScoringCriteriaController(ScoringCriteriaService service) {
        this.service = service;
    }

    @GetMapping("/rounds/{roundId}/criteria")
    @PreAuthorize("hasAnyRole('COORDINATOR','JUDGE','MENTOR')")
    public ResponseEntity<ApiResponse<List<ScoringCriteriaDto>>> list(@PathVariable Integer roundId) {
        return ResponseEntity.ok(ApiResponse.ok("Scoring criteria fetched", service.listByRound(roundId)));
    }

    @PostMapping("/coordinator/rounds/{roundId}/criteria")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<ApiResponse<ScoringCriteriaDto>> create(
            @PathVariable Integer roundId,
            @Valid @RequestBody ScoringCriteriaRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Criteria created", service.create(roundId, request)));
    }

    @PutMapping("/coordinator/criteria/{criteriaId}")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<ApiResponse<ScoringCriteriaDto>> update(
            @PathVariable Integer criteriaId,
            @Valid @RequestBody ScoringCriteriaRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Criteria updated", service.update(criteriaId, request)));
    }

    @DeleteMapping("/coordinator/criteria/{criteriaId}")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Integer criteriaId) {
        service.delete(criteriaId);
        return ResponseEntity.ok(ApiResponse.ok("Criteria deleted", null));
    }
}