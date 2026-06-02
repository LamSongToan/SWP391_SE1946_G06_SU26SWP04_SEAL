package com.seal.hackathon.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank @Email String email,
        @NotBlank
        @Pattern(regexp = "^\\d{6}$", message = "otp must be a 6-digit code")
        String otp,
        @NotBlank
        @Size(min = 8, max = 72)
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,72}$",
                message = "newPassword must include at least one letter, one number, and one special character"
        )
        String newPassword
) {}
