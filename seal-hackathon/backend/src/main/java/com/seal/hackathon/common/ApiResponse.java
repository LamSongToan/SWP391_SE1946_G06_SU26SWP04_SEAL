package com.seal.hackathon.common;

import java.time.Instant;

public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        String errorCode,
        Instant timestamp
) {
    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data, null, Instant.now());
    }

    public static <T> ApiResponse<T> fail(String message, T data) {
        return fail(message, data, "ERROR");
    }

    public static <T> ApiResponse<T> fail(String message, T data, String errorCode) {
        return new ApiResponse<>(false, message, data, errorCode, Instant.now());
    }
}
