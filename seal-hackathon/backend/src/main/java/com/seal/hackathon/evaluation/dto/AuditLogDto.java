package com.seal.hackathon.evaluation.dto;

import java.time.LocalDateTime;

public record AuditLogDto(
        Integer logId,
        Integer userId,
        String actorName,
        String actorUsername,
        String actionType,
        String targetEntity,
        Integer targetId,
        String targetName,
        String oldValue,
        String newValue,
        String reason,
        LocalDateTime timestamp,
        String ipAddress,
        String deviceInfo
) {
}
