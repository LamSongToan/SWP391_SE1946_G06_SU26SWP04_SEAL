package com.seal.hackathon.event.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TrackConfigurationRequest(
        Integer trackId,
        @NotBlank
        @Size(max = 100)
        String name
) {
}
