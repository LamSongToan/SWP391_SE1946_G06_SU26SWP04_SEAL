package com.seal.hackathon.auth.controller;

import com.seal.hackathon.auth.dto.*;
import com.seal.hackathon.auth.service.AuthService;
import com.seal.hackathon.auth.service.LogoutService;
import com.seal.hackathon.auth.service.PasswordService;
import com.seal.hackathon.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final LogoutService logoutService;
    private final PasswordService passwordService;

    public AuthController(AuthService authService,
            LogoutService logoutService,
            PasswordService passwordService) {
        this.authService = authService;
        this.logoutService = logoutService;
        this.passwordService = passwordService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Register completed", authService.register(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Login successful", authService.login(request)));
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<GoogleLoginResponse>> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Google sign-in processed", authService.loginWithGoogle(request)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody LogoutRequest request) {
        logoutService.logout(request.accessToken());
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully", null));
    }

    @PostMapping("/register/google")
    public ResponseEntity<ApiResponse<RegisterResponse>> registerWithGoogle(
            @Valid @RequestBody GoogleRegisterRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Google registration completed", authService.registerWithGoogle(request)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<ForgotPasswordResponse>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        ForgotPasswordResponse data = passwordService.forgotPassword(request.email());
        return ResponseEntity.ok(ApiResponse.ok("Password reset OTP sent", data));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        passwordService.resetPassword(request.email(), request.otp(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.ok("Password reset successfully", null));
    }

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<ApiResponse<Void>> verifyResetOtp(
            @Valid @RequestBody VerifyResetOtpRequest request) {
        passwordService.verifyResetOtp(request.email(), request.otp());
        return ResponseEntity.ok(ApiResponse.ok("OTP verified successfully", null));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        passwordService.changePassword(authentication, request.currentPassword(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.ok("Password changed successfully", null));
    }
}
