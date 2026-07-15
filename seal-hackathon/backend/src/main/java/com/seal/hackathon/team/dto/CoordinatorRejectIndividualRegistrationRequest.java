package com.seal.hackathon.team.dto;

import jakarta.validation.constraints.NotBlank;

public record CoordinatorRejectIndividualRegistrationRequest(
        @NotBlank(message = "Reason is required")
        String reason
) {
}
