package com.seal.hackathon.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTeamRequest(
        @NotNull Integer trackId,
        @NotBlank @Size(max = 100) String teamName
) {
}
