package com.seal.hackathon.event.dto;

import jakarta.validation.constraints.NotNull;

public record RoundScoreLockRequest(
        @NotNull Boolean scoreLocked
) {
}
