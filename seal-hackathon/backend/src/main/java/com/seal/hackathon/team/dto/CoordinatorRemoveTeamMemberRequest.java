package com.seal.hackathon.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CoordinatorRemoveTeamMemberRequest(
        @NotBlank
        @Size(max = 500)
        String reason
) {
}
