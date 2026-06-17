package com.seal.hackathon.event.dto;

public record EventWizardAwardRequest(
        String awardName,
        Integer quantity
) {
}
