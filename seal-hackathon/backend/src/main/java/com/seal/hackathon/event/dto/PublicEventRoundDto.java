package com.seal.hackathon.event.dto;

import java.time.LocalDateTime;
import java.util.List;

public record PublicEventRoundDto(
        Integer roundId,
        String roundName,
        Integer roundOrder,
        boolean finalRound,
        LocalDateTime submissionDeadline,
        List<PublicEventCriterionDto> criteria
) {
}
