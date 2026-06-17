package com.seal.hackathon.event.dto;

import java.time.LocalDateTime;
import java.util.List;

public record EventWizardRequest(
        String name,
        String semester,
        Integer year,
        String description,
        LocalDateTime registrationStartAt,
        LocalDateTime registrationEndAt,
        LocalDateTime competitionStartAt,
        LocalDateTime competitionEndAt,
        String trackSelectionMode,
        List<EventWizardTrackRequest> tracks,
        List<EventWizardRoundRequest> qualifyingRounds,
        EventWizardRoundRequest finalRound,
        String rankingMethod,
        List<EventWizardAwardRequest> awards,
        List<EventWizardCriterionRequest> scoringCriteria
) {
}
