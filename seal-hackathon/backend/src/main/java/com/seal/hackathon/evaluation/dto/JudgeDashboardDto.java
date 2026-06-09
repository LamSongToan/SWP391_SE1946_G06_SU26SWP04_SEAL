package com.seal.hackathon.evaluation.dto;

import java.util.List;

public record JudgeDashboardDto(
        Integer assignedRoundCount,
        Integer assignedSubmissionCount,
        Integer pendingSubmissionCount,
        Integer submittedScoreCount,
        List<AssignedRoundDto> assignedRounds,
        List<EvaluationSubmissionDto> submissions
) {
}
