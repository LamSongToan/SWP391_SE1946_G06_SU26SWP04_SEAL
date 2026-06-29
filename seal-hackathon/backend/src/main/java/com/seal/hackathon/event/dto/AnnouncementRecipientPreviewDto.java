package com.seal.hackathon.event.dto;

public record AnnouncementRecipientPreviewDto(
        Integer eventId,
        String audience,
        Integer recipientCount
) {
}
