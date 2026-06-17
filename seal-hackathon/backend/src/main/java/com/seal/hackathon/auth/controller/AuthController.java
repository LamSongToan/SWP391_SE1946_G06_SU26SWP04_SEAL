package com.seal.hackathon.auth.controller;

import com.seal.hackathon.auth.dto.*;
import com.seal.hackathon.auth.service.AuthService;
import com.seal.hackathon.auth.service.LogoutService;
import com.seal.hackathon.auth.service.PasswordService;
import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.common.ApiException;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
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
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Register completed", authService.register(request)));
    }

    @GetMapping("/register/rejected")
    public ResponseEntity<ApiResponse<RejectedRegistrationDraftDto>> getRejectedRegistrationDraft(
            @RequestParam("token") String token) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Rejected registration draft fetched",
                authService.getRejectedRegistrationDraft(token)
        ));
    }

    @PutMapping("/register/rejected")
    public ResponseEntity<ApiResponse<RegisterResponse>> resubmitRejectedRegistration(
            @Valid @RequestBody RejectedRegistrationResubmitRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Rejected registration resubmitted",
                authService.resubmitRejectedRegistration(request)
        ));
    }

    @PostMapping("/register/send-otp")
    public ResponseEntity<ApiResponse<RegistrationOtpResponse>> sendRegistrationOtp(
            @Valid @RequestBody RegistrationOtpRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Registration verification code sent",
                authService.sendRegistrationOtp(request)
        ));
    }

    @PostMapping("/register/verify-otp")
    public ResponseEntity<ApiResponse<Void>> verifyRegistrationOtp(
            @Valid @RequestBody VerifyRegistrationOtpRequest request) {
        authService.verifyRegistrationOtp(request);
        return ResponseEntity.ok(ApiResponse.ok("Registration verification code confirmed", null));
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
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        logoutService.logout(extractBearerToken(authorizationHeader));
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully", null));
    }

    @PostMapping("/register/google")
    public ResponseEntity<ApiResponse<RegisterResponse>> registerWithGoogle(
            @Valid @RequestBody GoogleRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Google registration completed", authService.registerWithGoogle(request)));
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

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Bearer token is required");
        }
        return authorizationHeader.substring(7);
    }
}
