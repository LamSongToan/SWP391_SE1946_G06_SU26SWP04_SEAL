package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SubmissionJudgeScoreDto(
        Integer judgeAssignmentId,
        Integer judgeRoleId,
        String judgeName,
        BigDecimal totalScore,
        boolean finalized,
        LocalDateTime finalizedAt,
        List<SubmissionJudgeCriterionScoreDto> criteria
) {
}
