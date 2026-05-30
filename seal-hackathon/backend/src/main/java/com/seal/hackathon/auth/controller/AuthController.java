package com.seal.hackathon.auth.controller;

import com.seal.hackathon.auth.dto.AuthResponse;
import com.seal.hackathon.auth.dto.LoginRequest;
import com.seal.hackathon.auth.dto.RegisterRequest;
import com.seal.hackathon.auth.dto.RegisterResponse;
import com.seal.hackathon.auth.service.AuthService;
import com.seal.hackathon.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(@Valid @RequestBody RegisterRequest request) {
        RegisterResponse data = authService.register(request);
        return ResponseEntity.ok(ApiResponse.ok("Register completed", data));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse data = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", data));
    }
}
