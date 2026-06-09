package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;

public record CriteriaDefinitionDto(
        Integer criteriaId,
        String criteriaName,
        BigDecimal weight,
        String criteriaType
) {
}
