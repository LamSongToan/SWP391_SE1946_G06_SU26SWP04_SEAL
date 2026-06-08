package com.seal.hackathon.auth.dto;

import jakarta.validation.constraints.*;

public record CreateGuestJudgeRequest(
        @NotBlank @Size(min = 4, max = 50)
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$")
        String username,
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Email String email,
        @Size(max = 150) String organization,
        @Size(max = 100) String department
) {}