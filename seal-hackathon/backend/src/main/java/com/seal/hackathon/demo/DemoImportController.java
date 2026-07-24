package com.seal.hackathon.demo;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.demo.dto.DemoImportResultDto;
import com.seal.hackathon.demo.dto.DemoImportStatusDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/coordinator/demo-import")
@PreAuthorize("hasRole('COORDINATOR')")
public class DemoImportController {

    private final DemoImportService demoImportService;

    public DemoImportController(DemoImportService demoImportService) {
        this.demoImportService = demoImportService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<DemoImportStatusDto>> getStatus() {
        return ResponseEntity.ok(ApiResponse.ok(
                "Demo import status fetched",
                demoImportService.getStatus()
        ));
    }

    @PostMapping("/{scenarioKey}")
    public ResponseEntity<ApiResponse<DemoImportResultDto>> importScenario(
            @PathVariable String scenarioKey) {
        DemoImportResultDto result = demoImportService.importScenario(scenarioKey);
        return ResponseEntity.ok(ApiResponse.ok(
                "Demo data imported for " + result.title(),
                result
        ));
    }
}
