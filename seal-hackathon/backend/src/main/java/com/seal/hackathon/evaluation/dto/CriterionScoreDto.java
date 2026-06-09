package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;

public record CriterionScoreDto(
        Integer criteriaId,
        String criteriaName,
        BigDecimal weight,
        String criteriaType,
        BigDecimal scoreValue,
        String comment
) {
}
