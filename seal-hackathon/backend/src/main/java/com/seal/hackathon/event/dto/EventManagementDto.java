package com.seal.hackathon.event.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EventManagementDto(
        Integer eventId,
        String name,
        String semester,
        Integer year,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        String description,
        LocalDateTime registrationStartAt,
        LocalDateTime registrationEndAt,
        LocalDateTime competitionStartAt,
        LocalDateTime competitionEndAt,
        String trackSelectionMode,
        String rankingMethod,
        int trackCount,
        int roundCount,
        boolean canDelete,
        boolean published
) {
}
