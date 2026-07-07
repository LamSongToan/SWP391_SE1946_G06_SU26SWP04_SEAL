package com.seal.hackathon.team.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BulkAssignIndividualsRequest(
        @NotEmpty List<Integer> individualRegistrationIds,
        @NotNull Integer teamId
) {
}
