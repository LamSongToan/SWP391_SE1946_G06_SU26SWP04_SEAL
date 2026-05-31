package com.seal.hackathon.team.dto;

import java.time.LocalDateTime;

public record TeamInvitationDto(
        Integer invitationId,
        Integer teamId,
        String teamName,
        String trackName,
        String eventName,
        String invitedByName,
        String inviteeName,
        String inviteeIdentifier,
        String status,
        LocalDateTime createdAt,
        LocalDateTime respondedAt
) {
}
