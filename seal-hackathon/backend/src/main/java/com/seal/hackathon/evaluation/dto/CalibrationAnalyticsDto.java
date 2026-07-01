package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;
import java.util.List;

public record CalibrationAnalyticsDto(
        Integer sessionId,
        Integer scoreCount,
        BigDecimal averageScore,
        BigDecimal minScore,
        BigDecimal maxScore,
        List<CalibrationScoreDto> scores
) {
}
