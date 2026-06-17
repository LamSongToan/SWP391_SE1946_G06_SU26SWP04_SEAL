package com.seal.hackathon.team.dto;

import jakarta.validation.constraints.NotNull;

public record RegisterTeamForEventRequest(
        @NotNull Integer eventId,
        Integer trackId
) {
}
