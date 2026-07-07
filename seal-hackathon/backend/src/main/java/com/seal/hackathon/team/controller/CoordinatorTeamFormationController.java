package com.seal.hackathon.team.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.team.dto.AssignIndividualToTeamRequest;
import com.seal.hackathon.team.dto.AssignTeamTrackRequest;
import com.seal.hackathon.team.dto.BulkAssignIndividualsRequest;
import com.seal.hackathon.team.dto.TeamFormationDashboardDto;
import com.seal.hackathon.team.service.TeamFormationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/coordinator/events/{eventId}/team-formation")
@PreAuthorize("hasRole('COORDINATOR')")
public class CoordinatorTeamFormationController {

    private final TeamFormationService teamFormationService;

    public CoordinatorTeamFormationController(TeamFormationService teamFormationService) {
        this.teamFormationService = teamFormationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> getDashboard(@PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok("Team formation dashboard fetched", teamFormationService.getFormationDashboard(eventId)));
    }

    @PostMapping("/auto-match")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> autoMatch(@PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok("Waiting individuals auto-matched", teamFormationService.autoMatchWaitingIndividuals(eventId)));
    }

    @PostMapping("/individual-registrations/{individualRegistrationId}/assign")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> assignIndividual(
            @PathVariable Integer eventId,
            @PathVariable Integer individualRegistrationId,
            @Valid @RequestBody AssignIndividualToTeamRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Individual assigned to team",
                teamFormationService.assignIndividualToTeam(eventId, individualRegistrationId, request.teamId())
        ));
    }

    @PostMapping("/individual-registrations/bulk-assign")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> bulkAssignIndividuals(
            @PathVariable Integer eventId,
            @Valid @RequestBody BulkAssignIndividualsRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Individuals assigned to team",
                teamFormationService.bulkAssignIndividualsToTeam(eventId, request.individualRegistrationIds(), request.teamId())
        ));
    }

    @PatchMapping("/teams/{teamId}/track")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> assignTeamTrack(
            @PathVariable Integer eventId,
            @PathVariable Integer teamId,
            @Valid @RequestBody AssignTeamTrackRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Team track updated",
                teamFormationService.assignTeamTrack(eventId, teamId, request.trackId())
        ));
    }
}
