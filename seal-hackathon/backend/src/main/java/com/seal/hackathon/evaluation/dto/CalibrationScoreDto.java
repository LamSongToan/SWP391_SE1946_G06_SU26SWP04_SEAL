package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CalibrationScoreDto(
        Integer scoreId,
        Integer submissionId,
        String teamName,
        Integer criteriaId,
        String criteriaName,
        Integer judgeAssignmentId,
        BigDecimal scoreValue,
        String comment,
        LocalDateTime scoredAt
) {
}
