package com.seal.hackathon.team.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TeamDto(
        Integer teamId,
        String teamName,
        String joinCode,
        String status,
        Integer trackId,
        String trackName,
        Integer eventId,
        String eventName,
        String eventStatus,
        String mentorNames,
        Integer leaderUserRoleId,
        String leaderName,
        int memberCount,
        boolean membershipValid,
        String validationMessage,
        boolean currentUserLeader,
        boolean acceptAutoAssignedMembers,
        boolean autoAssignedMembersEditable,
        boolean deletable,
        LocalDateTime createdAt,
        List<TeamMemberDto> members,
        Integer latestSubmissionId,
        Integer latestRoundId,
        String latestSubmissionStatus,
        String currentRoundName,
        LocalDateTime submissionDeadline
) {
}
