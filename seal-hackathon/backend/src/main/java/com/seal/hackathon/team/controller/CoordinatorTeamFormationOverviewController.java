package com.seal.hackathon.team.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.team.dto.TeamFormationDashboardDto;
import com.seal.hackathon.team.service.TeamFormationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/coordinator/team-formation")
@PreAuthorize("hasRole('COORDINATOR')")
public class CoordinatorTeamFormationOverviewController {

    private final TeamFormationService teamFormationService;

    public CoordinatorTeamFormationOverviewController(TeamFormationService teamFormationService) {
        this.teamFormationService = teamFormationService;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> getSystemOverview() {
        return ResponseEntity.ok(ApiResponse.ok(
                "System-wide team overview fetched",
                teamFormationService.getSystemFormationDashboard()
        ));
    }
}
