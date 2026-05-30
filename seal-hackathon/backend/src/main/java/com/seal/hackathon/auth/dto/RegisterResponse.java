package com.seal.hackathon.auth.dto;

public record RegisterResponse(
        Integer userId,
        String username,
        String email,
        String status,
        String message
) {
}
