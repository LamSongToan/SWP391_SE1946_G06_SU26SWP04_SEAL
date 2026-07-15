package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;
import java.util.List;

public record SubmissionScoreBreakdownDto(
        Integer submissionId,
        Integer teamId,
        String teamName,
        Integer roundId,
        String roundName,
        Integer trackId,
        String trackName,
        BigDecimal totalScore,
        Integer rankPosition,
        String qualificationStatus,
        String qualificationNote,
        List<SubmissionCriterionBreakdownDto> criteria,
        List<SubmissionJudgeScoreDto> judgeScores,
        List<FeedbackDto> feedback
) {
}
