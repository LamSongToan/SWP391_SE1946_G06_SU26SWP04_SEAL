package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TeamAwardHistoryDto(
        Integer teamPrizeId,
        Integer teamId,
        String teamName,
        Integer trackId,
        String trackName,
        String awardName,
        Long prizeAmountVnd,
        Integer rankPosition,
        BigDecimal totalScore,
        LocalDateTime awardedAt
) {
}
