package com.seal.hackathon.auth.controller;

import com.seal.hackathon.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/demo")
public class AuthzDemoController {

    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> me(Authentication authentication) {
        return ApiResponse.ok("Authenticated user",
                Map.of(
                        "email", authentication.getName(),
                        "authorities", authentication.getAuthorities().stream().map(Object::toString).toList()
                ));
    }

    @GetMapping("/student")
    @PreAuthorize("hasRole('STUDENT')")
    public ApiResponse<String> studentOnly() {
        return ApiResponse.ok("Access granted", "Student endpoint");
    }

    @GetMapping("/coordinator")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ApiResponse<String> coordinatorOnly() {
        return ApiResponse.ok("Access granted", "Coordinator endpoint");
    }
}
