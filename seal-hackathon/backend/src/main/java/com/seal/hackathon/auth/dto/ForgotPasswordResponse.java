package com.seal.hackathon.auth.dto;

public record ForgotPasswordResponse(
        String message,
        Long expiresInMinutes
) {}
