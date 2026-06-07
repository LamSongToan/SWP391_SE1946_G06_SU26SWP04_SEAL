package com.seal.hackathon.submission.dto;

import java.time.LocalDateTime;

public record SubmissionHistoryDto(
        Integer historyId,
        Integer submissionId,
        String actionType,
        Integer changedByUserRoleId,
        String changedByName,
        String oldRepositoryUrl,
        String newRepositoryUrl,
        String oldDemoUrl,
        String newDemoUrl,
        String oldSlideUrl,
        String newSlideUrl,
        String oldStatus,
        String newStatus,
        LocalDateTime createdAt
) {
}
