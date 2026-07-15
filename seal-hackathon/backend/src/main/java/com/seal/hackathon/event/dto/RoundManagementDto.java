package com.seal.hackathon.event.dto;

import java.time.LocalDateTime;

public record RoundManagementDto(
        Integer roundId,
        Integer eventId,
        String roundName,
        Integer roundOrder,
        LocalDateTime startAt,
        LocalDateTime submissionDeadline,
        LocalDateTime endAt,
        Integer promotionRuleTopN,
        Boolean scoreLocked,
        Boolean finalRound,
        Boolean judgeAssignmentLocked,
        String judgeAssignmentLockReason
) {
}
