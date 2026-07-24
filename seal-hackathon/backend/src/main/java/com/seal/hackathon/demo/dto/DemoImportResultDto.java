package com.seal.hackathon.demo.dto;

import java.time.LocalDateTime;

public record DemoImportResultDto(
        String scenarioKey,
        String title,
        LocalDateTime anchorDateTime,
        LocalDateTime importedAt,
        long durationMillis,
        DemoEventSnapshotDto event
) {
}
