package com.seal.hackathon.event.dto;

import java.math.BigDecimal;

public record ScoringCriteriaDto(
        Integer criteriaId,
        Integer roundId,
        String criteriaName,
        BigDecimal weight,
        String criteriaType
) {}