package com.seal.hackathon.team.dto;

import java.time.LocalDateTime;

public record TeamMemberDto(
        Integer userRoleId,
        String username,
        String email,
        String fullName,
        boolean leader,
        LocalDateTime joinedAt
) {
}
