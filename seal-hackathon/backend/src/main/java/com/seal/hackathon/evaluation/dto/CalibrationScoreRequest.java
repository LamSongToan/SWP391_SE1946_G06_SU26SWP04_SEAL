package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;

public record CalibrationScoreRequest(
        Integer submissionId,
        Integer criteriaId,
        Integer judgeAssignmentId,
        BigDecimal scoreValue,
        String comment
) {
}
