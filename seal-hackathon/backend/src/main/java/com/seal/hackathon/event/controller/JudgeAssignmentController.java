package com.seal.hackathon.event.controller;

import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.JudgeProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.event.dto.AssignJudgeRequest;
import com.seal.hackathon.event.dto.JudgeAssignmentDto;
import com.seal.hackathon.event.service.JudgeAssignmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class JudgeAssignmentController {

    private final JudgeAssignmentService service;
    private final UserRepository userRepository;
    private final JudgeProfileRepository judgeProfileRepository;

    public JudgeAssignmentController(JudgeAssignmentService service,
                                      UserRepository userRepository,
                                      JudgeProfileRepository judgeProfileRepository) {
        this.service = service;
        this.userRepository = userRepository;
        this.judgeProfileRepository = judgeProfileRepository;
    }

    @GetMapping("/coordinator/rounds/{roundId}/judges")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<ApiResponse<List<JudgeAssignmentDto>>> listByRound(@PathVariable Integer roundId) {
        return ResponseEntity.ok(ApiResponse.ok("Judge assignments fetched", service.listByRound(roundId)));
    }

    @GetMapping("/coordinator/rounds/{roundId}/tracks/{trackId}/judges")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<ApiResponse<List<JudgeAssignmentDto>>> listByRoundAndTrack(
            @PathVariable Integer roundId, @PathVariable Integer trackId) {
        return ResponseEntity.ok(ApiResponse.ok("Assignments fetched",
                service.listByRoundAndTrack(roundId, trackId)));
    }

    @PostMapping("/coordinator/rounds/{roundId}/judges")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<ApiResponse<JudgeAssignmentDto>> assign(
            @PathVariable Integer roundId,
            @Valid @RequestBody AssignJudgeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Judge assigned", service.assign(roundId, request)));
    }

    @DeleteMapping("/coordinator/judge-assignments/{assignmentId}")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<ApiResponse<Void>> remove(@PathVariable Integer assignmentId) {
        service.remove(assignmentId);
        return ResponseEntity.ok(ApiResponse.ok("Assignment removed", null));
    }

    @GetMapping("/judge/assignments")
    @PreAuthorize("hasRole('JUDGE')")
    public ResponseEntity<ApiResponse<List<JudgeAssignmentDto>>> myAssignments(Authentication authentication) {
        Integer judgeUserRoleId = resolveJudgeUserRoleId(authentication);
        return ResponseEntity.ok(ApiResponse.ok("My assignments fetched",
                service.listMyAssignments(judgeUserRoleId)));
    }

    private Integer resolveJudgeUserRoleId(Authentication authentication) {
        UserEntity user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return judgeProfileRepository.findByUserRoleUserUserId(user.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Judge profile required"))
                .getUserRoleId();
    }
}