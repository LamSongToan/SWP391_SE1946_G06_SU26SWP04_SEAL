package com.seal.hackathon.event.dto;

import java.time.LocalDateTime;

public record TrackMentorDto(
        Integer trackMentorId,
        Integer trackId,
        String trackName,
        Integer eventId,
        String eventName,
        String eventStatus,
        Boolean feedbackEnabled,
        Integer mentorUserRoleId,
        String mentorName,
        String mentorEmail,
        String department,
        String specialization,
        LocalDateTime assignedAt
) {}
