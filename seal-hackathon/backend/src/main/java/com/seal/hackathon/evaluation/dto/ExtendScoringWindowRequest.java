package com.seal.hackathon.evaluation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ExtendScoringWindowRequest(
        @NotNull @Min(1) Integer days
) {
}
