package com.seal.hackathon.team.dto;

import jakarta.validation.constraints.NotBlank;

public record InviteTeamMemberRequest(
        @NotBlank String identifier
) {
}
