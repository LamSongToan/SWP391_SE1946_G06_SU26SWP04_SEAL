package com.seal.hackathon.auth.dto;

import java.time.LocalDateTime;

public record GuestJudgeDto(
        Integer userId,
        Integer judgeUserRoleId,
        String username,
        String email,
        String fullName,
        String organization,
        String judgeType,
        String status,
        String temporaryPassword,
        LocalDateTime createdAt,
        LocalDateTime accountExpiry
) {}