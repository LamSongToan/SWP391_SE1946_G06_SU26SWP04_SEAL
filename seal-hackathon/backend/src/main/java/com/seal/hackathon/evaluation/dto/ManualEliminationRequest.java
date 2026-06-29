package com.seal.hackathon.evaluation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ManualEliminationRequest(
        @NotBlank(message = "Elimination reason is required")
        @Size(max = 300, message = "Elimination reason must be 300 characters or fewer")
        String reason
) {
}
