package com.seal.hackathon.evaluation.dto;

import java.util.List;

public record RoundTrackLeaderboardDto(
        Integer roundId,
        String roundName,
        Integer roundOrder,
        Integer trackId,
        String trackName,
        List<LeaderboardRowDto> rows,
        SubmissionScoreBreakdownDto teamBreakdown
) {
}
