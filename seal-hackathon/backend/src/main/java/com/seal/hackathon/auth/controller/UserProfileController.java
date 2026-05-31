package com.seal.hackathon.auth.controller;

import com.seal.hackathon.auth.dto.UpdateProfileRequest;
import com.seal.hackathon.auth.dto.UserProfileDto;
import com.seal.hackathon.auth.service.UserProfileService;
import com.seal.hackathon.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<UserProfileDto>> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok("Profile fetched", userProfileService.getMyProfile(authentication)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UserProfileDto>> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Profile updated", userProfileService.updateMyProfile(authentication, request)));
    }
}
