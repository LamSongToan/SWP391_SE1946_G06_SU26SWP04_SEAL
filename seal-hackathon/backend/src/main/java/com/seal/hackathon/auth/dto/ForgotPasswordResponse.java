package com.seal.hackathon.auth.dto;

public record ForgotPasswordResponse(
        String resetToken,       // returned directly — in prod this would be emailed
        String message,
        Long expiresInMinutes
) {}