package com.seal.hackathon.team.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.evaluation.dto.ManualEliminationRequest;
import com.seal.hackathon.team.dto.AssignIndividualToTeamRequest;
import com.seal.hackathon.team.dto.AssignTeamTrackRequest;
import com.seal.hackathon.team.dto.BalanceTracksRequest;
import com.seal.hackathon.team.dto.BulkAssignIndividualsRequest;
import com.seal.hackathon.team.dto.CoordinatorRejectIndividualRegistrationRequest;
import com.seal.hackathon.team.dto.CoordinatorRemoveTeamMemberRequest;
import com.seal.hackathon.team.dto.CoordinatorTrackChangeRequest;
import com.seal.hackathon.team.dto.MergeTrackRequest;
import com.seal.hackathon.team.dto.IndividualRegistrationDto;
import com.seal.hackathon.team.dto.TeamFormationDashboardDto;
import com.seal.hackathon.team.service.TeamFormationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> confirmEventStart(
            Authentication authentication,
            @PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Event started from team management",
                teamFormationService.confirmEventStart(authentication, eventId)
        ));
    }

    @PostMapping("/auto-match")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> autoMatch(@PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok("Waiting individuals auto-matched", teamFormationService.autoMatchWaitingIndividuals(eventId)));
    }

    @GetMapping("/individual-registrations")
    public ResponseEntity<ApiResponse<List<IndividualRegistrationDto>>> getIndividualRegistrations(
            @PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Individual registrations fetched",
                teamFormationService.listIndividualRegistrations(eventId)
        ));
    }

    @PostMapping("/individual-registrations/match-now")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> matchIndividualRegistrationsNow(
            Authentication authentication,
            @PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Eligible individual registrations matched",
                teamFormationService.matchWaitingIndividualsNow(authentication, eventId)
        ));
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

    @PostMapping("/individual-registrations/{individualRegistrationId}/request-track-change")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> requestTrackChange(
            Authentication authentication,
            @PathVariable Integer eventId,
            @PathVariable Integer individualRegistrationId,
            @Valid @RequestBody CoordinatorTrackChangeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Track change request sent",
                teamFormationService.requestIndividualTrackChange(
                        authentication,
                        eventId,
                        individualRegistrationId,
                        request.targetTrackId(),
                        request.reason()
                )
        ));
    }

    @PostMapping("/individual-registrations/{individualRegistrationId}/reject")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> rejectIndividualRegistration(
            Authentication authentication,
            @PathVariable Integer eventId,
            @PathVariable Integer individualRegistrationId,
            @Valid @RequestBody CoordinatorRejectIndividualRegistrationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Individual registration rejected",
                teamFormationService.rejectIndividualRegistration(
                        authentication,
                        eventId,
                        individualRegistrationId,
                        request.reason()
                )
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
            Authentication authentication,
            @PathVariable Integer eventId,
            @PathVariable Integer teamId,
            @Valid @RequestBody AssignTeamTrackRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Team track updated",
                teamFormationService.assignTeamTrack(authentication, eventId, teamId, request.trackId(), request.reason())
        ));
    }

    @PostMapping("/tracks/balance")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> balanceTracks(
            Authentication authentication,
            @PathVariable Integer eventId,
            @Valid @RequestBody BalanceTracksRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Tracks balanced",
                teamFormationService.balanceTracks(authentication, eventId, request.reason())
        ));
    }

    @PostMapping("/tracks/merge")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> mergeTracks(
            Authentication authentication,
            @PathVariable Integer eventId,
            @Valid @RequestBody MergeTrackRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Track merged",
                teamFormationService.mergeTracks(authentication, eventId, request.sourceTrackIds(), request.newTrackName(), request.reason())
        ));
    }

    @DeleteMapping("/teams/{teamId}/members/{userRoleId}")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> removeTeamMember(
            Authentication authentication,
            @PathVariable Integer eventId,
            @PathVariable Integer teamId,
            @PathVariable Integer userRoleId,
            @Valid @RequestBody CoordinatorRemoveTeamMemberRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Team member removed",
                teamFormationService.removeTeamMember(authentication, eventId, teamId, userRoleId, request.reason())
        ));
    }

    @PostMapping("/teams/{teamId}/disqualify")
    public ResponseEntity<ApiResponse<TeamFormationDashboardDto>> disqualifyTeam(
            Authentication authentication,
            @PathVariable Integer eventId,
            @PathVariable Integer teamId,
            @Valid @RequestBody ManualEliminationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Team removed from event",
                teamFormationService.disqualifyTeamSubmission(authentication, eventId, teamId, request)
        ));
    }
}
