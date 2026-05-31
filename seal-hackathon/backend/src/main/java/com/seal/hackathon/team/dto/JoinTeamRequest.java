package com.seal.hackathon.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinTeamRequest(
        @NotBlank @Size(max = 12) String joinCode
) {
}
