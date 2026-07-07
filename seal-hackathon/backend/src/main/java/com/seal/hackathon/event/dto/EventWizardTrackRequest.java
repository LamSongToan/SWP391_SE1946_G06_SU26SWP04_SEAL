package com.seal.hackathon.event.dto;

public record EventWizardTrackRequest(
        Integer trackId,
        String name,
        Integer minTeams,
        Integer maxTeams
) {
}
