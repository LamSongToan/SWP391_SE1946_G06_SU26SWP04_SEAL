package com.seal.hackathon.auth.service;

import com.seal.hackathon.auth.dto.ForgotPasswordResponse;
import com.seal.hackathon.auth.entity.PasswordResetTokenEntity;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.PasswordResetTokenRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class PasswordService {

    private static final long RESET_TOKEN_EXPIRY_MINUTES = 30;
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;

    public PasswordService(UserRepository userRepository,
                           PasswordResetTokenRepository resetTokenRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(String username) {
        // Always return the same shape — don't reveal whether user exists
        UserEntity user = userRepository.findByUsernameIgnoreCase(username.trim().toLowerCase(Locale.ROOT))
                .orElse(null);

        if (user == null) {
            // Security: don't leak user existence
            return new ForgotPasswordResponse(
                    null,
                    "If that username exists, a reset token has been generated.",
                    RESET_TOKEN_EXPIRY_MINUTES
            );
        }

        // Invalidate previous tokens
        resetTokenRepository.invalidateAllForUser(user.getUserId());

        String rawToken = generateSecureToken();

        PasswordResetTokenEntity tokenEntity = new PasswordResetTokenEntity();
        tokenEntity.setUser(user);
        tokenEntity.setToken(rawToken);
        tokenEntity.setExpiresAt(LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES));
        resetTokenRepository.save(tokenEntity);

        // In prod: email the token. For now: return it directly (mock flow)
        return new ForgotPasswordResponse(
                rawToken,
                "Reset token generated. In production this would be emailed.",
                RESET_TOKEN_EXPIRY_MINUTES
        );
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        PasswordResetTokenEntity tokenEntity = resetTokenRepository.findByToken(rawToken)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid or expired reset token"));

        if (Boolean.TRUE.equals(tokenEntity.getUsed())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Reset token has already been used");
        }
        if (tokenEntity.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Reset token has expired");
        }

        UserEntity user = tokenEntity.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        tokenEntity.setUsed(true);
        resetTokenRepository.save(tokenEntity);
    }

    @Transactional
    public void changePassword(Authentication authentication, String currentPassword, String newPassword) {
        String email = authentication.getName(); // JWT subject is email
        UserEntity user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "New password must differ from current password");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}