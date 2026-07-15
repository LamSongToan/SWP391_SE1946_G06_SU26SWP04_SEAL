package com.seal.hackathon.evaluation.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TeamLeaderboardDto(
        Integer teamId,
        Integer eventId,
        String eventName,
        String eventStatus,
        boolean resultPublished,
        LocalDateTime publishedAt,
        List<RoundTrackLeaderboardDto> groups
) {
}
