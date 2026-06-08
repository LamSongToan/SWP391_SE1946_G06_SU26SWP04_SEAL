package com.seal.hackathon.event.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ScoringCriteriaRequest(
        @NotBlank @Size(max = 150) String criteriaName,
        @NotNull @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal weight,
        @NotBlank @Size(max = 50) String criteriaType
) {}