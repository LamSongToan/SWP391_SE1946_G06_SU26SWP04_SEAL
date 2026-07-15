package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;

public record SubmissionJudgeCriterionScoreDto(
        Integer criteriaId,
        String criteriaName,
        BigDecimal weight,
        BigDecimal scoreValue,
        String comment
) {
}
