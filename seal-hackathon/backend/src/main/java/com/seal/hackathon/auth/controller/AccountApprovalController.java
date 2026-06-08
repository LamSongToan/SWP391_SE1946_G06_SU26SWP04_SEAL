package com.seal.hackathon.auth.controller;

import com.seal.hackathon.auth.dto.MentorOptionDto;
import com.seal.hackathon.auth.dto.PendingUserDto;
import com.seal.hackathon.auth.dto.UpdateManagedUserRequest;
import com.seal.hackathon.auth.dto.UserApprovalRequest;
import com.seal.hackathon.auth.service.AccountApprovalService;
import com.seal.hackathon.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/coordinator/users")
@PreAuthorize("hasRole('COORDINATOR')")
public class AccountApprovalController {

    private final AccountApprovalService approvalService;

    public AccountApprovalController(AccountApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    // GET /api/coordinator/users/pending
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<PendingUserDto>>> getPendingUsers() {
        return ResponseEntity.ok(ApiResponse.ok("Pending users fetched", approvalService.listPendingUsers()));
    }

    // GET /api/coordinator/users
    @GetMapping
    public ResponseEntity<ApiResponse<List<PendingUserDto>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.ok("All users fetched", approvalService.listAllUsers()));
    }

    // GET /api/coordinator/users/{userId}
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<PendingUserDto>> getUserDetails(@PathVariable Integer userId) {
        return ResponseEntity.ok(ApiResponse.ok("User details fetched", approvalService.getUserById(userId)));
    }

    // POST /api/coordinator/users/action
    @PostMapping("/action")
    public ResponseEntity<ApiResponse<PendingUserDto>> processAction(
            @Valid @RequestBody UserApprovalRequest request) {
        PendingUserDto updated = approvalService.processAction(
                request.userId(), request.action(), request.reason());
        return ResponseEntity.ok(ApiResponse.ok("User status updated to " + request.action(), updated));
    }

    // PUT /api/coordinator/users/{userId}
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<PendingUserDto>> updateManagedUser(
            @PathVariable Integer userId,
            @Valid @RequestBody UpdateManagedUserRequest request) {
        PendingUserDto updated = approvalService.updateManagedUser(userId, request);
        return ResponseEntity.ok(ApiResponse.ok("User updated", updated));
    }

    // GET /api/coordinator/users/mentors
    @GetMapping("/mentors")
    public ResponseEntity<ApiResponse<List<MentorOptionDto>>> getMentors() {
        return ResponseEntity.ok(ApiResponse.ok("Mentors fetched", approvalService.listMentors()));
    }
}
