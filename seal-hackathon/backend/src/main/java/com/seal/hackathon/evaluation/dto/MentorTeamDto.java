package com.seal.hackathon.evaluation.dto;

import java.util.List;

public record MentorTeamDto(
        Integer teamId,
        String teamName,
        Integer trackId,
        String trackName,
        Integer eventId,
        String eventName,
        Integer memberCount,
        String teamStatus,
        List<EvaluationSubmissionDto> submissions
) {
}
