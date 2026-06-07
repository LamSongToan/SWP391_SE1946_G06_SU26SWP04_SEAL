package com.seal.hackathon.submission.dto;

import java.time.LocalDateTime;

public record SubmissionRoundDto(
        Integer roundId,
        String roundName,
        Integer roundOrder,
        LocalDateTime submissionDeadline,
        Integer submissionId,
        String submissionStatus,
        boolean submitted,
        boolean editable,
        String blockedReason
) {
}
