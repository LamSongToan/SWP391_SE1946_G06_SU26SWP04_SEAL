package com.seal.hackathon.evaluation.dto;

import java.time.LocalDateTime;

public record CalibrationSessionDto(
        Integer sessionId,
        Integer roundId,
        String title,
        String status,
        LocalDateTime createdAt
) {
}
