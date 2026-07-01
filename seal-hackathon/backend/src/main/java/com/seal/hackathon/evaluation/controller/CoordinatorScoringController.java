package com.seal.hackathon.evaluation.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.evaluation.dto.AuditLogDto;
import com.seal.hackathon.evaluation.dto.AwardRecommendationSummaryDto;
import com.seal.hackathon.evaluation.dto.AwardSelectionRequest;
import com.seal.hackathon.evaluation.dto.CriteriaTemplateDto;
import com.seal.hackathon.evaluation.dto.CriteriaTemplateRequest;
import com.seal.hackathon.evaluation.dto.ManualEliminationRequest;
import com.seal.hackathon.evaluation.dto.RoundCriteriaManagementDto;
import com.seal.hackathon.evaluation.dto.RoundCriteriaUpdateRequest;
import com.seal.hackathon.evaluation.dto.RoundFinalizationDto;
import com.seal.hackathon.evaluation.dto.ResultPublicationDto;
import com.seal.hackathon.evaluation.dto.ScoreVarianceDashboardDto;
import com.seal.hackathon.evaluation.service.CoordinatorScoringService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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

import java.nio.charset.StandardCharsets;
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

    @GetMapping("/rounds/{roundId}/award-recommendations")
    public ResponseEntity<ApiResponse<AwardRecommendationSummaryDto>> getAwardRecommendations(Authentication authentication,
                                                                                               @PathVariable Integer roundId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Award recommendations fetched",
                coordinatorScoringService.generateAwardRecommendations(authentication, roundId)
        ));
    }

    @PostMapping("/rounds/{roundId}/award-recommendations")
    public ResponseEntity<ApiResponse<AwardRecommendationSummaryDto>> confirmAwardRecommendations(Authentication authentication,
                                                                                                     @PathVariable Integer roundId,
                                                                                                     @RequestBody List<AwardSelectionRequest> selections) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Award recommendations confirmed",
                coordinatorScoringService.confirmAwardRecommendations(authentication, roundId, selections)
        ));
    }

    @GetMapping("/events/{eventId}/result-publication")
    public ResponseEntity<ApiResponse<ResultPublicationDto>> getResultPublication(Authentication authentication,
                                                                                  @PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Result publication status fetched",
                coordinatorScoringService.getResultPublicationStatus(authentication, eventId)
        ));
    }

    @PostMapping("/events/{eventId}/publish-results")
    public ResponseEntity<ApiResponse<ResultPublicationDto>> publishResults(Authentication authentication,
                                                                            @PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Results published",
                coordinatorScoringService.publishEventResults(authentication, eventId)
        ));
    }

    @GetMapping("/rounds/{roundId}/ranking-report.csv")
    public ResponseEntity<byte[]> exportRankingReportCsv(Authentication authentication,
                                                         @PathVariable Integer roundId,
                                                         @RequestParam(required = false) Integer trackId) {
        String csv = coordinatorScoringService.exportRankingReportCsv(authentication, roundId, trackId);
        byte[] payload = csv.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"seal-round-" + roundId + "-ranking-report.csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(payload);
    }

    @GetMapping("/rounds/{roundId}/ranking-report.xls")
    public ResponseEntity<byte[]> exportRankingReportExcel(Authentication authentication,
                                                           @PathVariable Integer roundId,
                                                           @RequestParam(required = false) Integer trackId) {
        String html = coordinatorScoringService.exportRankingReportExcelHtml(authentication, roundId, trackId);
        byte[] payload = html.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"seal-round-" + roundId + "-ranking-report.xls\"")
                .contentType(MediaType.parseMediaType("application/vnd.ms-excel"))
                .body(payload);
    }

    @GetMapping("/rounds/{roundId}/variance-dashboard")
    public ResponseEntity<ApiResponse<ScoreVarianceDashboardDto>> getVarianceDashboard(Authentication authentication,
                                                                                       @PathVariable Integer roundId,
                                                                                       @RequestParam(required = false) Integer trackId,
                                                                                       @RequestParam(defaultValue = "true") boolean includeCalibration) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Judge score variance dashboard fetched",
                coordinatorScoringService.getScoreVarianceDashboard(authentication, roundId, trackId, includeCalibration)
        ));
    }

    @GetMapping("/rounds/{roundId}/research-dataset.csv")
    public ResponseEntity<byte[]> exportAnonymizedResearchDataset(Authentication authentication,
                                                                  @PathVariable Integer roundId,
                                                                  @RequestParam(required = false) Integer trackId,
                                                                  @RequestParam(defaultValue = "true") boolean includeCalibration) {
        String csv = coordinatorScoringService.exportAnonymizedScoringDatasetCsv(
                authentication,
                roundId,
                trackId,
                includeCalibration
        );
        byte[] payload = csv.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"seal-round-" + roundId + "-anonymized-scoring.csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(payload);
    }

    @PostMapping("/rounds/{roundId}/finalize")
    public ResponseEntity<ApiResponse<RoundFinalizationDto>> finalizeRound(Authentication authentication,
                                                                           @PathVariable Integer roundId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Round scoring finalized",
                coordinatorScoringService.finalizeRoundScores(authentication, roundId)
        ));
    }

    @PostMapping("/rounds/{roundId}/qualification")
    public ResponseEntity<ApiResponse<RoundFinalizationDto>> calculateQualification(Authentication authentication,
                                                                                    @PathVariable Integer roundId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Round qualification calculated",
                coordinatorScoringService.calculateRoundQualification(authentication, roundId)
        ));
    }

    @PostMapping("/rounds/{roundId}/advance")
    public ResponseEntity<ApiResponse<RoundFinalizationDto>> advanceRound(Authentication authentication,
                                                                          @PathVariable Integer roundId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Round advancement applied",
                coordinatorScoringService.applyRoundAdvancement(authentication, roundId)
        ));
    }

    @PostMapping("/rounds/{roundId}/submissions/{submissionId}/disqualify")
    public ResponseEntity<ApiResponse<RoundFinalizationDto>> manuallyDisqualify(Authentication authentication,
                                                                                @PathVariable Integer roundId,
                                                                                @PathVariable Integer submissionId,
                                                                                @Valid @RequestBody ManualEliminationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Team manually disqualified",
                coordinatorScoringService.manuallyDisqualifySubmission(authentication, roundId, submissionId, request)
        ));
    }

    @PostMapping("/rounds/{roundId}/submissions/{submissionId}/undo-disqualify")
    public ResponseEntity<ApiResponse<RoundFinalizationDto>> undoManualDisqualification(Authentication authentication,
                                                                                        @PathVariable Integer roundId,
                                                                                        @PathVariable Integer submissionId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Team disqualification has been undone",
                coordinatorScoringService.undoManualDisqualification(authentication, roundId, submissionId)
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
