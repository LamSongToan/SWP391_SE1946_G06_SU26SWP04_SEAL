package com.seal.hackathon.evaluation.dto;

import java.time.LocalDateTime;

public record EvaluationSubmissionDto(
        Integer submissionId,
        Integer eventId,
        String eventName,
        String eventStatus,
        Integer teamId,
        String teamName,
        Integer trackId,
        String trackName,
        Integer roundId,
        String roundName,
        Integer roundOrder,
        LocalDateTime submissionDeadline,
        Boolean scoreLocked,
        String repositoryUrl,
        String demoUrl,
        String slideUrl,
        String submissionStatus,
        LocalDateTime submittedAt,
        String evaluationStatus,
        Boolean scoredByCurrentJudge,
        Integer scoredCriteriaCount,
        Integer totalCriteriaCount,
        Boolean editable
) {
}
