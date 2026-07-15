package com.seal.hackathon.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record MergeTrackRequest(
        @NotEmpty List<Integer> sourceTrackIds,
        @NotBlank String newTrackName,
        @NotBlank String reason
) {
}
