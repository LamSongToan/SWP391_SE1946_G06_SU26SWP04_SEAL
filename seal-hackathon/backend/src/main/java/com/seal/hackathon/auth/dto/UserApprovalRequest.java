package com.seal.hackathon.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UserApprovalRequest(
        @NotNull Integer userId,
        // Allowed: ACTIVE, REJECTED, PENDING_APPROVAL, SUSPENDED
        @NotBlank String action,
        String reason
) {}
