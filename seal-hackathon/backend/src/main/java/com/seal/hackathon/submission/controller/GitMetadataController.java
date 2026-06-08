package com.seal.hackathon.submission.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.submission.dto.GitMetadataDto;
import com.seal.hackathon.submission.service.GitMetadataService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/submissions/{submissionId}/git-metadata")
public class GitMetadataController {

    private final GitMetadataService service;

    public GitMetadataController(GitMetadataService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('COORDINATOR','JUDGE','MENTOR','STUDENT')")
    public ResponseEntity<ApiResponse<GitMetadataDto>> get(@PathVariable Integer submissionId) {
        return ResponseEntity.ok(ApiResponse.ok("Git metadata fetched", service.getStored(submissionId)));
    }

    @PostMapping("/refresh")
    @PreAuthorize("hasAnyRole('COORDINATOR','JUDGE')")
    public ResponseEntity<ApiResponse<GitMetadataDto>> refresh(@PathVariable Integer submissionId) {
        return ResponseEntity.ok(ApiResponse.ok("Git metadata refreshed", service.fetchAndStore(submissionId)));
    }
}