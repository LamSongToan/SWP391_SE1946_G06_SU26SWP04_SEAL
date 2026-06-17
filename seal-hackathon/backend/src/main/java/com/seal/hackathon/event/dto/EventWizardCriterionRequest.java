package com.seal.hackathon.event.dto;

public record EventWizardCriterionRequest(
        String criterionName,
        String description,
        Integer weight
) {
}
