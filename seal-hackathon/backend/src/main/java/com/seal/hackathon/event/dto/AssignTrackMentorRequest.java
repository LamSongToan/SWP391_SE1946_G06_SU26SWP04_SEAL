package com.seal.hackathon.event.dto;

import jakarta.validation.constraints.NotNull;

public record AssignTrackMentorRequest(
        @NotNull Integer mentorUserRoleId,
        @NotNull Integer trackId
) {}