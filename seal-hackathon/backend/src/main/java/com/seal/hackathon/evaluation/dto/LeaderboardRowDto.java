package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;

public record LeaderboardRowDto(
        Integer submissionId,
        Integer teamId,
        String teamName,
        BigDecimal totalScore,
        Integer rankPosition,
        String qualificationStatus,
        String qualificationNote,
        String awardName,
        Long prizeAmountVnd
) {
}
