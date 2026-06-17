package com.seal.hackathon.auth.dto;

import java.util.List;

public record AuthResponse(
        String accessToken,
        String tokenType,
        Long expiresInSeconds,
        String email,
        String username,
        String fullName,
        String status,
        List<String> roles,
        Boolean mustChangePassword
) {
}
