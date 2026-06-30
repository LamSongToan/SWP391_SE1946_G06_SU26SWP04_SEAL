package com.seal.hackathon.evaluation.dto;

import java.time.LocalDateTime;

public record ResultPublicationDto(
        Integer eventId,
        String eventName,
        String status,
        boolean resultPublished,
        LocalDateTime publishedAt,
        Integer finalRoundId,
        String finalRoundName,
        Integer publishedRankingCount,
        Integer notificationCount,
        String message,
        boolean finalRoundScoreLocked,
        Integer finalRoundSubmissionCount,
        boolean rankingSnapshotComplete,
        boolean canPublish,
        String publishReadinessNote
) {
}
