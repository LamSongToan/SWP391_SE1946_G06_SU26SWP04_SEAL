package com.seal.hackathon.event.dto;

import java.time.LocalDateTime;
import java.util.List;

public record PublicEventCatalogDto(
        Integer eventId,
        String name,
        String semester,
        Integer year,
        String status,
        String description,
        LocalDateTime registrationStartAt,
        LocalDateTime registrationEndAt,
        LocalDateTime competitionStartAt,
        LocalDateTime competitionEndAt,
        String trackSelectionMode,
        boolean registrationAvailable,
        List<PublicEventRoundDto> rounds
) {
}
