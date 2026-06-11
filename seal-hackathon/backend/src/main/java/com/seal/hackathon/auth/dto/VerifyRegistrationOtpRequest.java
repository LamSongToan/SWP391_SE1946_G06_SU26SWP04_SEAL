package com.seal.hackathon.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyRegistrationOtpRequest(
        @NotBlank
        @Email
        String email,
        @NotBlank
        @Pattern(regexp = "^\\d{6}$", message = "email verification code must contain 6 digits")
        String otp
) {
}
