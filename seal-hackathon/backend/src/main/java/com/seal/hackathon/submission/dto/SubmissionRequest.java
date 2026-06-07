package com.seal.hackathon.submission.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubmissionRequest(
        @NotBlank(message = "Repository URL is required")
        @Size(max = 1000, message = "Repository URL must be 1000 characters or fewer")
        String repositoryUrl,

        @Size(max = 1000, message = "Demo URL must be 1000 characters or fewer")
        String demoUrl,

        @Size(max = 1000, message = "Slide URL must be 1000 characters or fewer")
        String slideUrl
) {
}
