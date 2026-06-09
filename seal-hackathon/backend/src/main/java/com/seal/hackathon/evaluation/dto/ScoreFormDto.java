package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ScoreFormDto(
        EvaluationSubmissionDto submission,
        Integer judgeAssignmentId,
        Integer evaluationId,
        String evaluationStatus,
        LocalDateTime finalizedAt,
        Boolean editable,
        String lockedReason,
        BigDecimal weightedTotal,
        List<CriterionScoreDto> criteria,
        List<ScoreHistoryDto> scoreHistory,
        List<FeedbackDto> feedbackHistory
) {
}
