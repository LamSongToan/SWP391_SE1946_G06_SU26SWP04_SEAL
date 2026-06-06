package com.seal.hackathon.auth.dto;

import java.time.LocalDateTime;
import java.util.List;

public record PendingUserDto(
        Integer userId,
        String username,
        String email,
        String fullName,
        String status,
        List<String> roles,
        LocalDateTime createdAt,
        String studentType,
        String studentCode,
        String universityName,
        String rejectionReason
) {}
