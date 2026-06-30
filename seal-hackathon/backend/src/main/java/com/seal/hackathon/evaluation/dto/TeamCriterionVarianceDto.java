package com.seal.hackathon.evaluation.dto;

public record TeamCriterionVarianceDto(
        Integer trackId,
        String trackName,
        Integer teamId,
        String teamName,
        Integer submissionId,
        Integer criteriaId,
        String criteriaName,
        Integer judgeCount,
        Double averageScore,
        Double minScore,
        Double maxScore,
        Double scoreRange,
        Double variance,
        Double standardDeviation
) {
}
