package com.seal.hackathon.team.dto;

import java.time.LocalDateTime;

public record IndividualRegistrationDto(
        Integer individualRegistrationId,
        Integer eventId,
        String eventName,
        Integer trackId,
        String trackName,
        Integer userRoleId,
        String username,
        String email,
        String fullName,
        String status,
        Integer assignedTeamId,
        String assignedTeamName,
        LocalDateTime createdAt,
        LocalDateTime matchedAt
) {
}
