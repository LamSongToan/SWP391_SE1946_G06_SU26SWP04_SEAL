package com.seal.hackathon.evaluation.dto;

import java.time.LocalDateTime;

public record FeedbackDto(
        Integer feedbackId,
        Integer submissionId,
        Integer authorUserRoleId,
        String authorName,
        String authorRole,
        String feedbackText,
        LocalDateTime createdAt
) {
}
