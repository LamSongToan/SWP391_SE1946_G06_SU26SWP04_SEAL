package com.seal.hackathon.event.dto;

public record TrackDto(
        Integer trackId,
        Integer eventId,
        String name,
        Integer minTeams,
        Integer maxTeams,
        Long teamCount,
        Boolean mentorAssignmentLocked,
        String mentorAssignmentLockReason
) {
}
