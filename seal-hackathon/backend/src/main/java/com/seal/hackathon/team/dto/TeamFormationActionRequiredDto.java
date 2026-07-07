package com.seal.hackathon.team.dto;

public record TeamFormationActionRequiredDto(
        String type,
        String severity,
        String message,
        Integer teamId,
        Integer trackId,
        Integer individualRegistrationId
) {
}
