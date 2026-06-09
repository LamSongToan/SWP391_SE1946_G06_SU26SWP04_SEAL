package com.seal.hackathon.evaluation.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CriteriaDefinitionRequest(
        Integer criteriaId,
        @NotBlank
        @Size(max = 150)
        String criteriaName,
        @NotNull
        @DecimalMin(value = "0.01")
        BigDecimal weight,
        @NotBlank
        @Size(max = 50)
        String criteriaType
) {
}
