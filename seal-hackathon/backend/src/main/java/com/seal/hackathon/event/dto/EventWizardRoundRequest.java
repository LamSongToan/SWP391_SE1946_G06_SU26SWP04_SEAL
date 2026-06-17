package com.seal.hackathon.event.dto;

import java.time.LocalDateTime;
import java.util.List;

public record EventWizardRoundRequest(
        Integer roundId,
        String roundName,
        Integer roundOrder,
        LocalDateTime submissionDeadline,
        Integer promotionRuleTopN,
        Boolean finalRound,
        List<EventWizardCriterionRequest> criteria
) {
}
