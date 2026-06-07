package com.seal.hackathon.submission.dto;

import java.time.LocalDateTime;

public record SubmissionDto(
        Integer submissionId,
        Integer teamId,
        String teamName,
        Integer eventId,
        String eventName,
        Integer trackId,
        String trackName,
        Integer roundId,
        String roundName,
        Integer roundOrder,
        LocalDateTime submissionDeadline,
        String repositoryUrl,
        String demoUrl,
        String slideUrl,
        String status,
        LocalDateTime submittedAt,
        LocalDateTime updatedAt,
        Integer submittedByUserRoleId,
        String submittedByName,
        boolean currentUserLeader,
        boolean editable
) {
}
