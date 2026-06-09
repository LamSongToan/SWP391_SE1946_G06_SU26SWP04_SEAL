package com.seal.hackathon.evaluation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record RoundCriteriaUpdateRequest(
        @NotEmpty
        List<@Valid CriteriaDefinitionRequest> criteria
) {
}
