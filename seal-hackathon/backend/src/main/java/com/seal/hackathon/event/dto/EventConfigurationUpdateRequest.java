package com.seal.hackathon.event.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record EventConfigurationUpdateRequest(
        @NotNull @Valid EventUpsertRequest event,
        @NotEmpty List<@Valid TrackConfigurationRequest> tracks,
        @NotEmpty List<@Valid RoundConfigurationRequest> rounds
) {
}
