package com.seal.hackathon.auth.dto;

import java.time.LocalDateTime;
import java.util.List;

public record UserDirectoryProfileDto(
        Integer userId,
        String username,
        String email,
        String fullName,
        String avatarUrl,
        String bio,
        String status,
        Boolean approved,
        LocalDateTime createdAt,
        List<String> roles,
        String studentType,
        String universityName
) {
}
