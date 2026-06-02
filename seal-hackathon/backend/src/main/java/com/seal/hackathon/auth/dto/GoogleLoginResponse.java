package com.seal.hackathon.auth.dto;

public record GoogleLoginResponse(
        boolean registrationRequired,
        AuthResponse auth,
        String email,
        String fullName,
        String pictureUrl
) {
}
