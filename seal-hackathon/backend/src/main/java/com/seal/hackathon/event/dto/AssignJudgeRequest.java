package com.seal.hackathon.event.dto;

import jakarta.validation.constraints.NotNull;

public record AssignJudgeRequest(
        @NotNull Integer judgeUserRoleId,
        @NotNull Integer trackId
) {}