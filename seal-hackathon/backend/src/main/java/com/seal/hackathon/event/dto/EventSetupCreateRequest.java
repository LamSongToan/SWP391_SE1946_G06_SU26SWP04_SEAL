package com.seal.hackathon.event.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record EventSetupCreateRequest(
        @NotNull
        @Valid
        EventUpsertRequest event,
        @NotEmpty
        List<@Valid TrackUpsertRequest> tracks,
        @NotEmpty
        List<@Valid RoundUpsertRequest> rounds
) {
}
