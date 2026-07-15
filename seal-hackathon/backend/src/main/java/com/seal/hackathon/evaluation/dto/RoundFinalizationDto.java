package com.seal.hackathon.evaluation.dto;

import java.time.LocalDateTime;
import java.util.List;

public record RoundFinalizationDto(
        Integer eventId,
        String eventName,
        Integer roundId,
        String roundName,
        Integer roundOrder,
        Integer promotionRuleTopN,
        boolean promotionRulesConfigured,
        Integer nextRoundId,
        String nextRoundName,
        boolean scoreLocked,
        Integer criteriaCount,
        Integer totalSubmissions,
        Integer readySubmissions,
        boolean canFinalize,
        String finalizationNote,
        boolean qualificationCalculated,
        String qualificationNote,
        boolean advancementApplied,
        String advancementNote,
        LocalDateTime finalizedAt,
        LocalDateTime scoringDeadline,
        boolean scoringDeadlinePassed,
        boolean forceFinalizeAllowed,
        boolean canExtendScoring,
        Integer unresolvedSubmissionCount,
        String overdueWarningMessage,
        List<FinalizationSubmissionDto> submissions
) {
}
