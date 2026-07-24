package com.seal.hackathon.demo.dto;

import java.time.LocalDateTime;

public record DemoEventSnapshotDto(
        Integer eventId,
        String name,
        String semester,
        Integer year,
        String status,
        LocalDateTime registrationStartAt,
        LocalDateTime registrationEndAt,
        LocalDateTime competitionStartAt,
        LocalDateTime competitionEndAt
) {
}
