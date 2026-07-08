package com.seal.hackathon.auth.controller;

import com.seal.hackathon.auth.dto.UpdateProfileRequest;
import com.seal.hackathon.auth.dto.UserProfileDto;
import com.seal.hackathon.auth.service.UserProfileService;
import com.seal.hackathon.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
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
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/users/me")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<UserProfileDto>> getMyProfile(Authentication authentication, HttpServletRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Profile fetched", resolveAvatarUrl(userProfileService.getMyProfile(authentication), request)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UserProfileDto>> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request,
            HttpServletRequest servletRequest) {
        return ResponseEntity.ok(ApiResponse.ok("Profile updated", resolveAvatarUrl(userProfileService.updateMyProfile(authentication, request), servletRequest)));
    }

    @PostMapping(path = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserProfileDto>> uploadAvatar(
            Authentication authentication,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Avatar updated", resolveAvatarUrl(userProfileService.uploadAvatar(authentication, file), request)));
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<ApiResponse<UserProfileDto>> removeAvatar(Authentication authentication, HttpServletRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Avatar removed", resolveAvatarUrl(userProfileService.removeAvatar(authentication), request)));
    }

    private UserProfileDto resolveAvatarUrl(UserProfileDto profile, HttpServletRequest request) {
        if (profile == null || profile.avatarUrl() == null || profile.avatarUrl().isBlank()) {
            return profile;
        }
        String avatarUrl = profile.avatarUrl().trim();
        if (!avatarUrl.startsWith("/uploads/avatars/")) {
            return profile;
        }

        String baseUrl = ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath(null)
                .replaceQuery(null)
                .build()
                .toUriString();

        return new UserProfileDto(
                profile.userId(),
                profile.username(),
                profile.email(),
                profile.fullName(),
                baseUrl + avatarUrl,
                profile.bio(),
                profile.status(),
                profile.approved(),
                profile.createdAt(),
                profile.roles(),
                profile.studentType(),
                profile.studentCode(),
                profile.universityName()
        );
    }
}
