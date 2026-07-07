package com.seal.hackathon.team.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TeamFormationDashboardDto(
        Integer eventId,
        String eventName,
        String eventStatus,
        LocalDateTime registrationEndAt,
        Integer minTeamSize,
        Integer maxTeamSize,
        String trackSelectionMode,
        boolean registrationClosed,
        List<TeamFormationActionRequiredDto> actionRequired,
        List<TeamDto> teams,
        List<IndividualRegistrationDto> waitingIndividuals,
        List<TeamFormationTrackDto> tracks
) {
}
