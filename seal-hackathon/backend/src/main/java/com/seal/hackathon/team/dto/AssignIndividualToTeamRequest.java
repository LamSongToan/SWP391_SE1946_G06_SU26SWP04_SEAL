package com.seal.hackathon.team.dto;

import jakarta.validation.constraints.NotNull;

public record AssignIndividualToTeamRequest(
        @NotNull Integer teamId
) {
}
