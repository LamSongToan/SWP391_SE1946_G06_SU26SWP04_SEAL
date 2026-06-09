package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;
import java.util.List;

public record RoundCriteriaManagementDto(
        Integer eventId,
        String eventName,
        Integer roundId,
        String roundName,
        Integer roundOrder,
        boolean editable,
        String lockedReason,
        BigDecimal totalWeight,
        List<CriteriaDefinitionDto> criteria
) {
}
