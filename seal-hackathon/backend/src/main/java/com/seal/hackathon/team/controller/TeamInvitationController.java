package com.seal.hackathon.team.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.team.dto.TeamDto;
import com.seal.hackathon.team.dto.TeamInvitationDto;
import com.seal.hackathon.team.service.TeamService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/team-invitations")
@PreAuthorize("hasRole('STUDENT')")
public class TeamInvitationController {

    private final TeamService teamService;

    public TeamInvitationController(TeamService teamService) {
        this.teamService = teamService;
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<TeamInvitationDto>>> getMyInvitations(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok("Team invitations fetched", teamService.listMyInvitations(authentication)));
    }

    @PostMapping("/{invitationId}/accept")
    public ResponseEntity<ApiResponse<TeamDto>> accept(Authentication authentication,
                                                       @PathVariable Integer invitationId) {
        return ResponseEntity.ok(ApiResponse.ok("Invitation accepted", teamService.acceptInvitation(authentication, invitationId)));
    }

    @PostMapping("/{invitationId}/reject")
    public ResponseEntity<ApiResponse<TeamInvitationDto>> reject(Authentication authentication,
                                                                @PathVariable Integer invitationId) {
        return ResponseEntity.ok(ApiResponse.ok("Invitation rejected", teamService.rejectInvitation(authentication, invitationId)));
    }
}
