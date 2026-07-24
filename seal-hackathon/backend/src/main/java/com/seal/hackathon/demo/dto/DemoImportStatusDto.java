package com.seal.hackathon.demo.dto;

import java.time.LocalDate;
import java.util.List;

public record DemoImportStatusDto(
        boolean enabled,
        String zoneId,
        LocalDate currentAnchorDate,
        String scriptRoot,
        boolean allScriptsAvailable,
        List<DemoScenarioDto> scenarios
) {
}
