package com.seal.hackathon.evaluation.dto;

import java.time.LocalDateTime;

public record AssignedRoundDto(
        Integer judgeAssignmentId,
        Integer eventId,
        String eventName,
        Integer roundId,
        String roundName,
        Integer roundOrder,
        LocalDateTime submissionDeadline,
        Boolean scoreLocked,
        Integer trackId,
        String trackName,
        Integer submissionCount,
        Integer scoredSubmissionCount
) {
}
