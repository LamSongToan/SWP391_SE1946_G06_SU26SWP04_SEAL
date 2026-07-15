package com.seal.hackathon.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CoordinatorTrackChangeRequest(
        @NotNull(message = "Target track is required")
        Integer targetTrackId,
        @NotBlank(message = "Reason is required")
        String reason
) {
}
