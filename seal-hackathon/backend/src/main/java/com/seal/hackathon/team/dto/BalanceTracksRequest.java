package com.seal.hackathon.team.dto;

import jakarta.validation.constraints.NotBlank;

public record BalanceTracksRequest(
        @NotBlank String reason
) {
}
