package com.seal.hackathon.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank
        @Size(min = 8, max = 72)
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,72}$",
                message = "newPassword must include at least one letter, one number, and one special character"
        )
        String newPassword
) {}
