package com.seal.hackathon.evaluation.dto;

import java.time.LocalDateTime;

public record AuditLogDto(
        Integer logId,
        Integer userId,
        String userName,
        String actionType,
        String targetEntity,
        Integer targetId,
        String oldValue,
        String newValue,
        String reason,
        LocalDateTime timestamp
) {
}
