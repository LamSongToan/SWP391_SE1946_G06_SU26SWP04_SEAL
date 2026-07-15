package com.seal.hackathon.event.dto;

import jakarta.validation.constraints.NotBlank;

public record CancelEventRequest(
        @NotBlank String reason
) {
}
