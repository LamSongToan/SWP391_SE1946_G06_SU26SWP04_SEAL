package com.seal.hackathon.auth.service;

import com.seal.hackathon.auth.entity.TokenBlacklistEntity;
import com.seal.hackathon.auth.repository.TokenBlacklistRepository;
import com.seal.hackathon.auth.security.JwtService;
import com.seal.hackathon.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class LogoutService {

    private final TokenBlacklistRepository tokenBlacklistRepository;
    private final JwtService jwtService;

    public LogoutService(TokenBlacklistRepository tokenBlacklistRepository, JwtService jwtService) {
        this.tokenBlacklistRepository = tokenBlacklistRepository;
        this.jwtService = jwtService;
    }

    @Transactional
    public void logout(String rawToken) {
        try {
            String tokenHash = jwtService.hashToken(rawToken);
            if (tokenBlacklistRepository.existsByTokenHash(tokenHash)) {
                return; // already blacklisted, idempotent
            }
            LocalDateTime expiresAt = jwtService.extractExpirationAsLocalDateTime(rawToken);

            TokenBlacklistEntity entity = new TokenBlacklistEntity();
            entity.setTokenHash(tokenHash);
            entity.setExpiresAt(expiresAt);
            tokenBlacklistRepository.save(entity);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid token");
        }
    }

    // Clean up expired blacklisted tokens every hour
    @Scheduled(fixedRate = 3_600_000)
    @Transactional
    public void purgeExpiredTokens() {
        tokenBlacklistRepository.deleteExpiredTokens(LocalDateTime.now());
    }
}