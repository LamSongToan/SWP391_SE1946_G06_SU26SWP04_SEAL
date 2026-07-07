package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record AwardResultDto(
        String awardName,
        Integer quantity,
        List<AwardWinnerDto> winners
) {
    public record AwardWinnerDto(
            Integer teamId,
            String teamName,
            Integer trackId,
            String trackName,
            Integer rankPosition,
            BigDecimal totalScore,
            LocalDateTime awardedAt
    ) {
    }
}
