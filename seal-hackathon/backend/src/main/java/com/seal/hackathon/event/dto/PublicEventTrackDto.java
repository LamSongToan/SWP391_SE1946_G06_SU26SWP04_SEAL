package com.seal.hackathon.event.dto;

public record PublicEventTrackDto(
        Integer trackId,
        String name,
        Integer minTeams,
        Integer maxTeams
) {
}
