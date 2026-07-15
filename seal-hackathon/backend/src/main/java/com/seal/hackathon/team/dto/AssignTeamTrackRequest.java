package com.seal.hackathon.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AssignTeamTrackRequest(
        @NotNull Integer trackId,
        @NotBlank String reason
) {
}
