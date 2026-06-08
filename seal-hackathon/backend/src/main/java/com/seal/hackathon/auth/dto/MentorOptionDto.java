package com.seal.hackathon.auth.dto;

public record MentorOptionDto(
        Integer mentorUserRoleId,
        String mentorName,
        String mentorEmail
) {}