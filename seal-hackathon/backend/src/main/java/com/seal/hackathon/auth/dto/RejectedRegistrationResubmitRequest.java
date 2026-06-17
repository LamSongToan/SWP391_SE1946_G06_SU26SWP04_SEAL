package com.seal.hackathon.auth.dto;

import com.seal.hackathon.auth.entity.StudentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RejectedRegistrationResubmitRequest(
        @NotBlank
        String token,
        @NotBlank
        @Size(min = 4, max = 50)
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "username only allows letters, numbers, dot, underscore and hyphen")
        String username,
        @NotBlank
        @Size(max = 150)
        String fullName,
        @NotNull
        StudentType studentType,
        String fptStudentCode,
        String externalStudentCode,
        String externalUniversity
) {
}
