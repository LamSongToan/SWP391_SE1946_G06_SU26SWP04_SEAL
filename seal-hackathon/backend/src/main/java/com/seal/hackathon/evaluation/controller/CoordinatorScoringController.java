package com.seal.hackathon.evaluation.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.evaluation.dto.AuditLogDto;
import com.seal.hackathon.evaluation.dto.CriteriaTemplateDto;
import com.seal.hackathon.evaluation.dto.CriteriaTemplateRequest;
import com.seal.hackathon.evaluation.dto.RoundCriteriaManagementDto;
import com.seal.hackathon.evaluation.dto.RoundCriteriaUpdateRequest;
import com.seal.hackathon.evaluation.dto.RoundFinalizationDto;
import com.seal.hackathon.evaluation.service.CoordinatorScoringService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/coordinator/scoring")
@PreAuthorize("hasRole('COORDINATOR')")
public class CoordinatorScoringController {

    private final CoordinatorScoringService coordinatorScoringService;

    public CoordinatorScoringController(CoordinatorScoringService coordinatorScoringService) {
        this.coordinatorScoringService = coordinatorScoringService;
    }

    @GetMapping("/rounds/{roundId}/criteria")
    public ResponseEntity<ApiResponse<RoundCriteriaManagementDto>> getRoundCriteria(Authentication authentication,
                                                                                    @PathVariable Integer roundId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Round scoring criteria fetched",
                coordinatorScoringService.getRoundCriteria(authentication, roundId)
        ));
    }

    @PutMapping("/rounds/{roundId}/criteria")
    public ResponseEntity<ApiResponse<RoundCriteriaManagementDto>> updateRoundCriteria(Authentication authentication,
                                                                                       @PathVariable Integer roundId,
                                                                                       @Valid @RequestBody RoundCriteriaUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Round scoring criteria updated",
                coordinatorScoringService.updateRoundCriteria(authentication, roundId, request)
        ));
    }

    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<CriteriaTemplateDto>>> listTemplates(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Criteria templates fetched",
                coordinatorScoringService.listCriteriaTemplates(authentication)
        ));
    }

    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<CriteriaTemplateDto>> createTemplate(Authentication authentication,
                                                                           @Valid @RequestBody CriteriaTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                "Criteria template created",
                coordinatorScoringService.createCriteriaTemplate(authentication, request)
        ));
    }

    @PutMapping("/templates/{templateId}")
    public ResponseEntity<ApiResponse<CriteriaTemplateDto>> updateTemplate(Authentication authentication,
                                                                           @PathVariable Integer templateId,
                                                                           @Valid @RequestBody CriteriaTemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Criteria template updated",
                coordinatorScoringService.updateCriteriaTemplate(authentication, templateId, request)
        ));
    }

    @DeleteMapping("/templates/{templateId}")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(Authentication authentication,
                                                            @PathVariable Integer templateId) {
        coordinatorScoringService.deleteCriteriaTemplate(authentication, templateId);
        return ResponseEntity.ok(ApiResponse.ok("Criteria template deleted", null));
    }

    @PostMapping("/rounds/{roundId}/apply-template/{templateId}")
    public ResponseEntity<ApiResponse<RoundCriteriaManagementDto>> applyTemplate(Authentication authentication,
                                                                                 @PathVariable Integer roundId,
                                                                                 @PathVariable Integer templateId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Criteria template applied to round",
                coordinatorScoringService.applyCriteriaTemplate(authentication, roundId, templateId)
        ));
    }

    @GetMapping("/rounds/{roundId}/finalization")
    public ResponseEntity<ApiResponse<RoundFinalizationDto>> getRoundFinalization(Authentication authentication,
                                                                                  @PathVariable Integer roundId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Round finalization snapshot fetched",
                coordinatorScoringService.getRoundFinalization(authentication, roundId)
        ));
    }

    @PostMapping("/rounds/{roundId}/finalize")
    public ResponseEntity<ApiResponse<RoundFinalizationDto>> finalizeRound(Authentication authentication,
                                                                           @PathVariable Integer roundId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Round scoring finalized",
                coordinatorScoringService.finalizeRoundScores(authentication, roundId)
        ));
    }

    @PostMapping("/rounds/{roundId}/reopen")
    public ResponseEntity<ApiResponse<RoundFinalizationDto>> reopenRound(Authentication authentication,
                                                                         @PathVariable Integer roundId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Round scoring reopened",
                coordinatorScoringService.reopenRoundFinalization(authentication, roundId)
        ));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<List<AuditLogDto>>> listAuditLogs(
            Authentication authentication,
            @RequestParam(required = false) Integer eventId,
            @RequestParam(required = false) Integer roundId,
            @RequestParam(required = false) String actionType) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Audit logs fetched",
                coordinatorScoringService.listAuditLogs(authentication, eventId, roundId, actionType)
        ));
    }
}
