package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ScoreHistoryDto(
        Integer scoreHistoryId,
        Integer criteriaId,
        String criteriaName,
        BigDecimal oldScoreValue,
        BigDecimal newScoreValue,
        String actionType,
        LocalDateTime createdAt
) {
}
