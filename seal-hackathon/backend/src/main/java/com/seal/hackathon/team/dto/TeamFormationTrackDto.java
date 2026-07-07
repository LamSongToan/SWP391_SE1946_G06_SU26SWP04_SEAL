package com.seal.hackathon.team.dto;

public record TeamFormationTrackDto(
        Integer trackId,
        String trackName,
        Integer minTeams,
        Integer maxTeams,
        long teamCount,
        String mentorNames
) {
}
