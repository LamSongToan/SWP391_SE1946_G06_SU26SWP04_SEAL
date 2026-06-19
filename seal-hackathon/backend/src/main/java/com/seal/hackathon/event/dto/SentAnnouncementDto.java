package com.seal.hackathon.event.dto;

import java.time.LocalDateTime;

public record SentAnnouncementDto(
        Integer announcementId,
        Integer eventId,
        String eventName,
        String title,
        String message,
        String audience,
        Integer recipientCount,
        LocalDateTime createdAt
) {
}
