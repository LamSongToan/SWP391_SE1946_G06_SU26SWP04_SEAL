package com.seal.hackathon.evaluation.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.evaluation.dto.FeedbackDto;
import com.seal.hackathon.evaluation.dto.FeedbackRequest;
import com.seal.hackathon.evaluation.dto.JudgeDashboardDto;
import com.seal.hackathon.evaluation.dto.MentorDashboardDto;
import com.seal.hackathon.evaluation.dto.ScoreFormDto;
import com.seal.hackathon.evaluation.dto.ScoreSubmissionRequest;
import com.seal.hackathon.evaluation.service.EvaluationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class EvaluationController {

    private final EvaluationService evaluationService;

    public EvaluationController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    @GetMapping("/judge/dashboard")
    @PreAuthorize("hasRole('JUDGE')")
    public ResponseEntity<ApiResponse<JudgeDashboardDto>> getJudgeDashboard(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Judge dashboard fetched",
                evaluationService.getJudgeDashboard(authentication)
        ));
    }

    @GetMapping("/judge/submissions/{submissionId}/score-form")
    @PreAuthorize("hasRole('JUDGE')")
    public ResponseEntity<ApiResponse<ScoreFormDto>> getScoreForm(Authentication authentication,
                                                                  @PathVariable Integer submissionId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Score form fetched",
                evaluationService.getScoreForm(authentication, submissionId)
        ));
    }

    @PostMapping("/judge/submissions/{submissionId}/scores")
    @PreAuthorize("hasRole('JUDGE')")
    public ResponseEntity<ApiResponse<ScoreFormDto>> submitScores(Authentication authentication,
                                                                  @PathVariable Integer submissionId,
                                                                  @Valid @RequestBody ScoreSubmissionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Scores submitted",
                evaluationService.submitScores(authentication, submissionId, request)
        ));
    }

    @GetMapping("/mentor/dashboard")
    @PreAuthorize("hasRole('MENTOR')")
    public ResponseEntity<ApiResponse<MentorDashboardDto>> getMentorDashboard(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Mentor dashboard fetched",
                evaluationService.getMentorDashboard(authentication)
        ));
    }

    @GetMapping("/submissions/{submissionId}/feedback")
    @PreAuthorize("hasAnyRole('STUDENT','JUDGE','MENTOR','COORDINATOR')")
    public ResponseEntity<ApiResponse<List<FeedbackDto>>> getFeedback(Authentication authentication,
                                                                      @PathVariable Integer submissionId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Feedback history fetched",
                evaluationService.listFeedbackForAuthorizedUser(authentication, submissionId)
        ));
    }

    @PostMapping("/submissions/{submissionId}/feedback")
    @PreAuthorize("hasAnyRole('JUDGE','MENTOR')")
    public ResponseEntity<ApiResponse<FeedbackDto>> addFeedback(Authentication authentication,
                                                                @PathVariable Integer submissionId,
                                                                @Valid @RequestBody FeedbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                "Feedback added",
                evaluationService.addFeedback(authentication, submissionId, request)
        ));
    }

    @PatchMapping("/coordinator/evaluations/{evaluationId}/reopen")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<ApiResponse<Void>> reopenEvaluation(Authentication authentication,
                                                              @PathVariable Integer evaluationId) {
        evaluationService.reopenEvaluation(authentication, evaluationId);
        return ResponseEntity.ok(ApiResponse.ok("Evaluation reopened", null));
    }
}
