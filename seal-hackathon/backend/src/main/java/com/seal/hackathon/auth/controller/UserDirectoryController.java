package com.seal.hackathon.auth.controller;

import com.seal.hackathon.auth.dto.UserDirectoryProfileDto;
import com.seal.hackathon.auth.service.UserDirectoryService;
import com.seal.hackathon.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users/directory")
public class UserDirectoryController {

    private final UserDirectoryService userDirectoryService;

    public UserDirectoryController(UserDirectoryService userDirectoryService) {
        this.userDirectoryService = userDirectoryService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDirectoryProfileDto>>> searchUsers(
            Authentication authentication,
            @RequestParam(value = "query", required = false) String query) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Directory users fetched",
                userDirectoryService.searchUsers(authentication, query)
        ));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserDirectoryProfileDto>> getUserProfile(
            Authentication authentication,
            @PathVariable Integer userId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Directory user fetched",
                userDirectoryService.getUserProfile(authentication, userId)
        ));
    }
}
