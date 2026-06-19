package com.seal.hackathon.event.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateAnnouncementRequest(
        @NotNull
        Integer eventId,
        @NotBlank
        @Size(max = 180)
        String title,
        @NotBlank
        @Size(max = 1000)
        String message,
        @NotBlank
        @Size(max = 30)
        String audience
) {
}
