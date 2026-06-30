package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;

public record CriterionVarianceDto(
        Integer criteriaId,
        String criteriaName,
        String criteriaType,
        BigDecimal criteriaWeight,
        Integer submissionGroupCount,
        Integer scoreCount,
        Integer judgeAssignmentCount,
        Double averageScore,
        Double minScore,
        Double maxScore,
        Double averageRange,
        Double averageVariance,
        Double standardDeviation
) {
}
