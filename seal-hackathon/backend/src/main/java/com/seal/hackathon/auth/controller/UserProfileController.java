package com.seal.hackathon.auth.controller;

import com.seal.hackathon.auth.dto.UpdateProfileRequest;
import com.seal.hackathon.auth.dto.UserProfileDto;
import com.seal.hackathon.auth.service.UserProfileService;
import com.seal.hackathon.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    @PostMapping(path = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserProfileDto>> uploadAvatar(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.ok("Avatar updated", userProfileService.uploadAvatar(authentication, file)));
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<ApiResponse<UserProfileDto>> removeAvatar(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok("Avatar removed", userProfileService.removeAvatar(authentication)));
    }
}
