package com.seal.hackathon.event.dto;

import java.time.LocalDateTime;
import java.util.List;

public record EventWizardRoundRequest(
        Integer roundId,
        String roundName,
        Integer roundOrder,
        LocalDateTime startAt,
        LocalDateTime submissionDeadline,
        LocalDateTime endAt,
        Integer promotionRuleTopN,
        Boolean finalRound,
        List<EventWizardCriterionRequest> criteria,
        List<TrackPromotionRuleRequest> trackPromotionRules
) {
}
