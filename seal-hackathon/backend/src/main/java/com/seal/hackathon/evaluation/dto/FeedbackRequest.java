package com.seal.hackathon.evaluation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FeedbackRequest(
        @NotBlank @Size(max = 4000) String feedbackText
) {
}
