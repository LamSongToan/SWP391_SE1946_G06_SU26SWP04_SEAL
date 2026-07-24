package com.seal.hackathon.demo.dto;

public record DemoScenarioDto(
        String key,
        String group,
        String title,
        String description,
        String relativePath,
        boolean reset,
        boolean available
) {
}
