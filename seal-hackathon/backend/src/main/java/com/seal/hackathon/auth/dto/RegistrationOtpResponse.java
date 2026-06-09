package com.seal.hackathon.auth.dto;

public record RegistrationOtpResponse(
        String message,
        long expiresInMinutes
) {
}
