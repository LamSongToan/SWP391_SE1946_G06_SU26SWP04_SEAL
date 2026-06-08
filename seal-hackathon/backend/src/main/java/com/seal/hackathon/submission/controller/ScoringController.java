package com.seal.hackathon.submission.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.submission.dto.ScoreDto;
import com.seal.hackathon.submission.dto.ScoreRequest;
import com.seal.hackathon.submission.service.ScoringService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ScoringController {

    private final ScoringService service;

    public ScoringController(ScoringService service) {
        this.service = service;
    }

    @GetMapping("/submissions/{submissionId}/scores")
    @PreAuthorize("hasAnyRole('COORDINATOR','JUDGE')")
    public ResponseEntity<ApiResponse<List<ScoreDto>>> listScores(@PathVariable Integer submissionId) {
        return ResponseEntity.ok(ApiResponse.ok("Scores fetched", service.listScoresForSubmission(submissionId)));
    }

    @PostMapping("/submissions/{submissionId}/scores")
    @PreAuthorize("hasRole('JUDGE')")
    public ResponseEntity<ApiResponse<ScoreDto>> submitScore(
            Authentication authentication,
            @PathVariable Integer submissionId,
            @Valid @RequestBody ScoreRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Score submitted",
                service.submitScore(authentication, submissionId, request)));
    }

    @GetMapping("/judge/scores")
    @PreAuthorize("hasRole('JUDGE')")
    public ResponseEntity<ApiResponse<List<ScoreDto>>> myScores(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok("My scores fetched", service.listMyScores(authentication)));
    }

    @GetMapping("/judge/submissions")
    @PreAuthorize("hasRole('JUDGE')")
    public ResponseEntity<ApiResponse<List<ScoreDto>>> mySubmissions(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok("Judge submissions fetched",
                service.listSubmissionsForJudge(authentication)));
    }
}