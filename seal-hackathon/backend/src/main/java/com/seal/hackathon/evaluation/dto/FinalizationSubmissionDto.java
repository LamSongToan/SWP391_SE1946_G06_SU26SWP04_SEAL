package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;

public record FinalizationSubmissionDto(
        Integer submissionId,
        Integer teamId,
        String teamName,
        Integer trackId,
        String trackName,
        String repositoryUrl,
        String submissionStatus,
        Integer assignedJudgeCount,
        Integer finalizedJudgeCount,
        BigDecimal totalScore,
        Integer rankPosition,
        boolean qualifiedNextRound,
        boolean ready,
        String readinessNote
) {
}
