package com.seal.hackathon.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateManagedUserRequest(
        @NotBlank
        @Size(min = 4, max = 50)
        String username,
        @NotBlank
        @Size(max = 150)
        String fullName,
        @NotBlank
        String status,
        @NotEmpty
        List<String> roles
) {
}
