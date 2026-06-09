package com.seal.hackathon.evaluation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CriteriaTemplateRequest(
        @NotBlank
        @Size(max = 150)
        String templateName,
        @Size(max = 500)
        String description,
        @NotEmpty
        List<@Valid CriteriaDefinitionRequest> criteria
) {
}
