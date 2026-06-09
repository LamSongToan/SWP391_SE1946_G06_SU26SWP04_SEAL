package com.seal.hackathon.evaluation.dto;

import java.util.List;

public record MentorDashboardDto(
        Integer assignedTrackCount,
        Integer mentoredTeamCount,
        Integer submissionCount,
        Integer feedbackCount,
        List<MentorTeamDto> teams
) {
}
