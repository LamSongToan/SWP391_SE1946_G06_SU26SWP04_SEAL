package com.seal.hackathon.auth.dto;

import com.seal.hackathon.auth.entity.StudentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank
        @Size(max = 150)
        String fullName,
        StudentType studentType,
        @Size(max = 50)
        String studentCode,
        @Size(max = 150)
        String universityName
) {
}
