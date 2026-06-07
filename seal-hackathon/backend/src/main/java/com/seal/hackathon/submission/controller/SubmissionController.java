package com.seal.hackathon.submission.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.submission.dto.SubmissionDto;
import com.seal.hackathon.submission.dto.SubmissionHistoryDto;
import com.seal.hackathon.submission.dto.SubmissionRequest;
import com.seal.hackathon.submission.dto.SubmissionRoundDto;
import com.seal.hackathon.submission.service.SubmissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SubmissionController {

    private final SubmissionService submissionService;

    public SubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @GetMapping("/teams/{teamId}/submissions")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<SubmissionDto>>> getTeamSubmissions(
            Authentication authentication,
            @PathVariable Integer teamId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Submissions fetched",
                submissionService.listTeamSubmissions(authentication, teamId)
        ));
    }

    @GetMapping("/teams/{teamId}/submission-rounds")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<SubmissionRoundDto>>> getSubmissionRounds(
            Authentication authentication,
            @PathVariable Integer teamId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Submission rounds fetched",
                submissionService.listSubmissionRounds(authentication, teamId)
        ));
    }

    @PostMapping("/teams/{teamId}/rounds/{roundId}/submission")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<SubmissionDto>> createSubmission(
            Authentication authentication,
            @PathVariable Integer teamId,
            @PathVariable Integer roundId,
            @Valid @RequestBody SubmissionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(
                        "Submission created",
                        submissionService.createSubmission(authentication, teamId, roundId, request)
                ));
    }

    @GetMapping("/submissions/{submissionId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<SubmissionDto>> getSubmission(
            Authentication authentication,
            @PathVariable Integer submissionId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Submission fetched",
                submissionService.getSubmission(authentication, submissionId)
        ));
    }

    @PutMapping("/submissions/{submissionId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<SubmissionDto>> updateSubmission(
            Authentication authentication,
            @PathVariable Integer submissionId,
            @Valid @RequestBody SubmissionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Submission updated",
                submissionService.updateSubmission(authentication, submissionId, request)
        ));
    }

    @GetMapping("/submissions/{submissionId}/history")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<SubmissionHistoryDto>>> getSubmissionHistory(
            Authentication authentication,
            @PathVariable Integer submissionId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Submission history fetched",
                submissionService.getSubmissionHistory(authentication, submissionId)
        ));
    }

    @GetMapping("/coordinator/events/{eventId}/submissions")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<ApiResponse<List<SubmissionDto>>> getEventSubmissions(@PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Event submissions fetched",
                submissionService.listEventSubmissions(eventId)
        ));
    }
}
