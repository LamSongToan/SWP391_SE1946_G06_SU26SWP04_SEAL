package com.seal.hackathon.evaluation.dto;

import java.time.LocalDateTime;
import java.util.List;

public record RoundFinalizationDto(
        Integer eventId,
        String eventName,
        Integer roundId,
        String roundName,
        Integer roundOrder,
        Integer promotionRuleTopN,
        boolean scoreLocked,
        Integer criteriaCount,
        Integer totalSubmissions,
        Integer readySubmissions,
        boolean canFinalize,
        String finalizationNote,
        LocalDateTime finalizedAt,
        List<FinalizationSubmissionDto> submissions
) {
}
