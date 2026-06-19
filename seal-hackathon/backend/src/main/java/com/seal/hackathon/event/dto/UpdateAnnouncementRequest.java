package com.seal.hackathon.event.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateAnnouncementRequest(
        @NotBlank
        @Size(max = 180)
        String title,
        @NotBlank
        @Size(max = 1000)
        String message
) {
}
