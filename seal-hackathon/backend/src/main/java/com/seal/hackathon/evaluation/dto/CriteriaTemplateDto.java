package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CriteriaTemplateDto(
        Integer templateId,
        String templateName,
        String description,
        Integer createdByUserId,
        String createdByName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        Integer criteriaCount,
        BigDecimal totalWeight,
        List<CriteriaDefinitionDto> criteria
) {
}
