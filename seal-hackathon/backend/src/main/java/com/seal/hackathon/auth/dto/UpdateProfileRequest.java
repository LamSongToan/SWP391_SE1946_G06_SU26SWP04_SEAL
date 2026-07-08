package com.seal.hackathon.auth.dto;

import com.seal.hackathon.auth.entity.StudentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank
        @Size(min = 4, max = 50)
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "username only allows letters, numbers, dot, underscore and hyphen")
        String username,
        @NotBlank
        @Size(max = 150)
        String fullName,
        @Size(max = 500)
        String avatarUrl,
        @Size(max = 1000)
        String bio,
        StudentType studentType,
        @Size(max = 50)
        String studentCode,
        @Size(max = 150)
        String universityName
) {
}
