package com.seal.hackathon.event.dto;

import java.time.LocalDateTime;

public record JudgeAssignmentDto(
        Integer judgeAssignmentId,
        Integer roundId,
        String roundName,
        Integer trackId,
        String trackName,
        Integer eventId,
        String eventName,
        Integer judgeUserRoleId,
        String judgeName,
        String judgeEmail,
        String organization,
        String judgeType,
        LocalDateTime assignedAt
) {}