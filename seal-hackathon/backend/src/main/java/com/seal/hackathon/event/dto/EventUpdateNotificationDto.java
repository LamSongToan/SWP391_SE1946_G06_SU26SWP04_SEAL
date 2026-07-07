package com.seal.hackathon.event.dto;

import java.time.LocalDateTime;

public record EventUpdateNotificationDto(
        Integer notificationId,
        Integer eventId,
        String eventName,
        String title,
        String message,
        String category,
        Boolean read,
        LocalDateTime readAt,
        LocalDateTime createdAt
) {
}
