package com.seal.hackathon.event.dto;

import java.time.LocalDate;

public record EventManagementDto(
        Integer eventId,
        String name,
        String season,
        Integer year,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        String description
) {
}
