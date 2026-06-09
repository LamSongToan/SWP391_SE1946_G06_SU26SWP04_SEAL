package com.seal.hackathon.evaluation.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CriterionScoreRequest(
        @NotNull Integer criteriaId,
        @NotNull @DecimalMin("0.00") @DecimalMax("10.00") BigDecimal scoreValue,
        String comment
) {
}
