package com.seal.hackathon.event.dto;

import java.time.LocalDate;
import java.util.List;

public record UpcomingEventDto(
        Integer eventId,
        String name,
        String season,
        Integer year,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        String description,
        List<PublicRoundMilestoneDto> rounds
) {
}
