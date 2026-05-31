package com.seal.hackathon.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UserApprovalRequest(
        @NotNull Integer userId,
        // Allowed: APPROVED, REJECTED, PENDING, DISABLED
        @NotBlank String action,
        String reason
) {}