package com.seal.hackathon.auth.dto;

import com.seal.hackathon.auth.entity.StudentType;

public record RejectedRegistrationDraftDto(
        String token,
        String email,
        String username,
        String fullName,
        StudentType studentType,
        String fptStudentCode,
        String externalStudentCode,
        String externalUniversity,
        String rejectionReason
) {
}
