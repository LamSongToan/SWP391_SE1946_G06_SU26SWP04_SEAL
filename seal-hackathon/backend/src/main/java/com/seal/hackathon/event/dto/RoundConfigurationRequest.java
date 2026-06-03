package com.seal.hackathon.event.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record RoundConfigurationRequest(
        Integer roundId,
        @NotBlank
        @Size(max = 100)
        String roundName,
        @NotNull
        @Min(1)
        Integer roundOrder,
        @NotNull
        LocalDateTime submissionDeadline,
        @NotNull
        @Min(1)
        @Max(999)
        Integer promotionRuleTopN
) {
}
