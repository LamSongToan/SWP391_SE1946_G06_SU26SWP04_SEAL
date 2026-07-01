package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;
import java.util.List;

public record AwardRecommendationSummaryDto(
        boolean canManage,
        List<AwardRecommendationDto> awards
) {
    public record AwardRecommendationDto(
            String awardName,
            Integer quantity,
            List<AwardWinnerDto> winners,
            List<Integer> selectedWinnerTeamIds
    ) {
    }

    public record AwardWinnerDto(
            Integer teamId,
            String teamName,
            Integer rankPosition,
            BigDecimal totalScore,
            String qualificationStatus
    ) {
    }
}
