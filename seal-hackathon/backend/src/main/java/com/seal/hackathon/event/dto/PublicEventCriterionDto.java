package com.seal.hackathon.event.dto;

public record PublicEventCriterionDto(
        Integer criteriaId,
        String criteriaName,
        Integer weight,
        String criteriaType
) {
}
