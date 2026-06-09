package com.seal.hackathon.event.dto;

import java.time.LocalDateTime;

public record RoundManagementDto(
        Integer roundId,
        Integer eventId,
        String roundName,
        Integer roundOrder,
        LocalDateTime submissionDeadline,
        Integer promotionRuleTopN,
        Boolean scoreLocked
) {
}
