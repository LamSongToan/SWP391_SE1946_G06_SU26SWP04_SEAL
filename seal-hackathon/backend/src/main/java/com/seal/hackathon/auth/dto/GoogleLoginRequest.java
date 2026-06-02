package com.seal.hackathon.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
        @NotBlank String idToken
) {
}
