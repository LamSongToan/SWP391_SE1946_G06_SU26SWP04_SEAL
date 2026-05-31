package com.seal.hackathon.team.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.event.dto.TrackDto;
import com.seal.hackathon.team.dto.CreateTeamRequest;
import com.seal.hackathon.team.dto.InviteTeamMemberRequest;
import com.seal.hackathon.team.dto.JoinTeamRequest;
import com.seal.hackathon.team.dto.TeamDto;
import com.seal.hackathon.team.dto.TeamInvitationDto;
import com.seal.hackathon.team.service.TeamService;
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
@RequestMapping("/api/teams")
@PreAuthorize("hasRole('STUDENT')")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<TeamDto>>> getMyTeams(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok("Teams fetched", teamService.listMyTeams(authentication)));
    }

    @GetMapping("/{teamId}")
    public ResponseEntity<ApiResponse<TeamDto>> getTeam(Authentication authentication,
                                                       @PathVariable Integer teamId) {
        return ResponseEntity.ok(ApiResponse.ok("Team fetched", teamService.getTeam(authentication, teamId)));
    }

    @GetMapping("/events/{eventId}/tracks")
    public ResponseEntity<ApiResponse<List<TrackDto>>> getRegistrationTracks(@PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.ok("Registration tracks fetched", teamService.listRegistrationTracks(eventId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TeamDto>> createTeam(Authentication authentication,
                                                          @Valid @RequestBody CreateTeamRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Team created", teamService.createTeam(authentication, request)));
    }

    @PostMapping("/{teamId}/invitations")
    public ResponseEntity<ApiResponse<TeamInvitationDto>> inviteMember(
            Authentication authentication,
            @PathVariable Integer teamId,
            @Valid @RequestBody InviteTeamMemberRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Invitation sent",
                teamService.inviteMember(authentication, teamId, request.identifier())
        ));
    }

    @GetMapping("/{teamId}/invitations")
    public ResponseEntity<ApiResponse<List<TeamInvitationDto>>> getTeamInvitations(
            Authentication authentication,
            @PathVariable Integer teamId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Team invitations fetched",
                teamService.listTeamInvitations(authentication, teamId)
        ));
    }

    @PostMapping("/{teamId}/invitations/{invitationId}/cancel")
    public ResponseEntity<ApiResponse<TeamInvitationDto>> cancelInvitation(
            Authentication authentication,
            @PathVariable Integer teamId,
            @PathVariable Integer invitationId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Invitation cancelled",
                teamService.cancelInvitation(authentication, teamId, invitationId)
        ));
    }

    @PostMapping("/join")
    public ResponseEntity<ApiResponse<TeamDto>> joinByCode(Authentication authentication,
                                                          @Valid @RequestBody JoinTeamRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Joined team", teamService.joinByCode(authentication, request.joinCode())));
    }

    @DeleteMapping("/{teamId}/members/{userRoleId}")
    public ResponseEntity<ApiResponse<TeamDto>> removeMember(Authentication authentication,
                                                            @PathVariable Integer teamId,
                                                            @PathVariable Integer userRoleId) {
        return ResponseEntity.ok(ApiResponse.ok("Team member removed", teamService.removeMember(authentication, teamId, userRoleId)));
    }

    @PatchMapping("/{teamId}/leader/{userRoleId}")
    public ResponseEntity<ApiResponse<TeamDto>> transferLeadership(Authentication authentication,
                                                                  @PathVariable Integer teamId,
                                                                  @PathVariable Integer userRoleId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Team leadership transferred",
                teamService.transferLeadership(authentication, teamId, userRoleId)
        ));
    }

    @DeleteMapping("/{teamId}/members/me")
    public ResponseEntity<ApiResponse<Void>> leaveTeam(Authentication authentication,
                                                       @PathVariable Integer teamId) {
        teamService.leaveTeam(authentication, teamId);
        return ResponseEntity.ok(ApiResponse.ok("Left team", null));
    }

    @DeleteMapping("/{teamId}")
    public ResponseEntity<ApiResponse<Void>> disbandTeam(Authentication authentication,
                                                        @PathVariable Integer teamId) {
        teamService.disbandTeam(authentication, teamId);
        return ResponseEntity.ok(ApiResponse.ok("Team disbanded", null));
    }
}
