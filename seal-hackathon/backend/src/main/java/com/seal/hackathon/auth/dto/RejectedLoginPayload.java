package com.seal.hackathon.auth.dto;

public record RejectedLoginPayload(
        String rejectionReason,
        String resubmitToken
) {
}
