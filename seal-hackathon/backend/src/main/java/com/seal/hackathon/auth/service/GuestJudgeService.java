package com.seal.hackathon.auth.service;

import com.seal.hackathon.auth.dto.CreateGuestJudgeRequest;
import com.seal.hackathon.auth.dto.GuestJudgeDto;
import com.seal.hackathon.auth.entity.*;
import com.seal.hackathon.auth.repository.*;
import com.seal.hackathon.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class GuestJudgeService {

    private static final String CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private final SecureRandom random = new SecureRandom();

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final JudgeProfileRepository judgeProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public GuestJudgeService(UserRepository userRepository,
                              UserRoleRepository userRoleRepository,
                              JudgeProfileRepository judgeProfileRepository,
                              PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.judgeProfileRepository = judgeProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public GuestJudgeDto createGuestJudge(CreateGuestJudgeRequest request) {
        String normalizedUsername = request.username().trim().toLowerCase(Locale.ROOT);
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
            throw new ApiException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }

        String tempPassword = generatePassword();
        LocalDateTime expiry = LocalDateTime.now().plusDays(90);

        UserEntity user = new UserEntity();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setFullName(request.fullName().trim());
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setStatus(UserStatus.ACTIVE.getDbValue());
        user.setApproved(true);

        UserRoleEntity role = new UserRoleEntity();
        role.setUser(user);
        role.setRoleType(RoleType.JUDGE.getDbValue());
        user.getUserRoles().add(role);

        UserEntity saved = userRepository.save(user);
        UserRoleEntity savedRole = saved.getUserRoles().iterator().next();

        JudgeProfileEntity profile = new JudgeProfileEntity();
        profile.setUserRole(savedRole);
        profile.setJudgeType("Guest");
        profile.setOrganization(request.organization() == null ? null : request.organization().trim());
        profile.setAccountExpiry(expiry);
        judgeProfileRepository.save(profile);

        return toDto(saved, savedRole, profile, tempPassword);
    }

    @Transactional(readOnly = true)
    public List<GuestJudgeDto> listJudges() {
        return userRepository.findAll().stream()
                .filter(u -> u.getUserRoles().stream()
                        .anyMatch(r -> r.getRoleType().equalsIgnoreCase(RoleType.JUDGE.getDbValue())))
                .map(u -> {
                    UserRoleEntity role = u.getUserRoles().stream()
                            .filter(r -> r.getRoleType().equalsIgnoreCase(RoleType.JUDGE.getDbValue()))
                            .findFirst().orElse(null);
                    JudgeProfileEntity profile = role == null ? null :
                            judgeProfileRepository.findById(role.getUserRoleId()).orElse(null);
                    return toDto(u, role, profile, null);
                })
                .toList();
    }

    @Transactional
    public GuestJudgeDto resetPassword(Integer userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        UserRoleEntity role = user.getUserRoles().stream()
                .filter(r -> r.getRoleType().equalsIgnoreCase(RoleType.JUDGE.getDbValue()))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "User is not a judge"));

        String tempPassword = generatePassword();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        userRepository.save(user);

        JudgeProfileEntity profile = judgeProfileRepository.findById(role.getUserRoleId()).orElse(null);
        return toDto(user, role, profile, tempPassword);
    }

    @Transactional
    public void deactivateJudge(Integer userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        boolean isJudge = user.getUserRoles().stream()
                .anyMatch(r -> r.getRoleType().equalsIgnoreCase(RoleType.JUDGE.getDbValue()));
        if (!isJudge) throw new ApiException(HttpStatus.BAD_REQUEST, "User is not a judge");
        user.setStatus(UserStatus.SUSPENDED.getDbValue());
        user.setApproved(false);
        userRepository.save(user);
    }

    private GuestJudgeDto toDto(UserEntity user, UserRoleEntity role, JudgeProfileEntity profile, String tempPassword) {
        return new GuestJudgeDto(
                user.getUserId(),
                role == null ? null : role.getUserRoleId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                profile == null ? null : profile.getOrganization(),
                profile == null ? null : profile.getJudgeType(),
                user.getStatus(),
                tempPassword,
                user.getCreatedAt(),
                profile == null ? null : profile.getAccountExpiry()
        );
    }

    private String generatePassword() {
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) sb.append(CHARS.charAt(random.nextInt(CHARS.length())));
        return sb.toString();
    }
}