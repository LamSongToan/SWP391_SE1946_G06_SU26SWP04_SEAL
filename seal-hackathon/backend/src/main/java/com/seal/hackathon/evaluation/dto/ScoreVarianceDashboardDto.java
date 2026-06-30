package com.seal.hackathon.evaluation.dto;

import java.util.List;

public record ScoreVarianceDashboardDto(
        Integer eventId,
        String eventName,
        Integer roundId,
        String roundName,
        Integer trackId,
        String trackName,
        boolean includeCalibration,
        Integer criteriaCount,
        Integer scoredSubmissionCount,
        Integer judgeAssignmentCount,
        Integer scoreCount,
        Double averageVariance,
        Double highestVariance,
        String highestVarianceCriterion,
        List<CriterionVarianceDto> criteria,
        List<TeamCriterionVarianceDto> teamCriteria
) {
}
