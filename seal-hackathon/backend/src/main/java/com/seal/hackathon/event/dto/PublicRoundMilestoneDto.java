package com.seal.hackathon.event.dto;

import java.time.LocalDateTime;

public record PublicRoundMilestoneDto(
        String roundName,
        Integer roundOrder,
        LocalDateTime submissionDeadline
) {
}
