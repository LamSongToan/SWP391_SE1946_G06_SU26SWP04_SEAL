package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;

public record SubmissionCriterionBreakdownDto(
        Integer criteriaId,
        String criteriaName,
        BigDecimal weight,
        BigDecimal averageScore
) {
}
