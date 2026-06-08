package com.seal.hackathon.submission.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ScoreRequest(
        @NotNull Integer criteriaId,
        @NotNull @DecimalMin("0.00") @DecimalMax("10.00") BigDecimal scoreValue,
        @Size(max = 2000) String comment
) {}