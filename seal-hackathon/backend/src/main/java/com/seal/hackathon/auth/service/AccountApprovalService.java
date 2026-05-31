package com.seal.hackathon.auth.service;

import com.seal.hackathon.auth.dto.PendingUserDto;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserStatus;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AccountApprovalService {

    private final UserRepository userRepository;

    public AccountApprovalService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<PendingUserDto> listPendingUsers() {
        return userRepository.findByStatus(UserStatus.PENDING.name(),
                Sort.by(Sort.Direction.ASC, "createdAt"))
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PendingUserDto> listAllUsers() {
        return userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public PendingUserDto processAction(Integer userId, String action, String reason) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        switch (action.toUpperCase()) {
            case "APPROVED" -> {
                if (!UserStatus.PENDING.name().equalsIgnoreCase(user.getStatus())
                        && !UserStatus.REJECTED.name().equalsIgnoreCase(user.getStatus())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Only PENDING or REJECTED accounts can be approved. Current status: " + user.getStatus());
                }
                user.setStatus(UserStatus.APPROVED.name());
                user.setApproved(true);
            }
            case "REJECTED" -> {
                if (!UserStatus.PENDING.name().equalsIgnoreCase(user.getStatus())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Only PENDING accounts can be rejected. Current status: " + user.getStatus());
                }
                user.setStatus(UserStatus.REJECTED.name());
                user.setApproved(false);
            }
            case "PENDING" -> {
                if (!UserStatus.REJECTED.name().equalsIgnoreCase(user.getStatus())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Only REJECTED accounts can be moved back to pending. Current status: " + user.getStatus());
                }
                user.setStatus(UserStatus.PENDING.name());
                user.setApproved(false);
            }
            case "DISABLED" -> {
                if (!UserStatus.APPROVED.name().equalsIgnoreCase(user.getStatus())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Only APPROVED accounts can be disabled. Current status: " + user.getStatus());
                }
                user.setStatus(UserStatus.DISABLED.name());
                user.setApproved(false);
            }
            default -> throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Invalid action. Allowed: APPROVED, REJECTED, PENDING, DISABLED");
        }

        userRepository.save(user);
        return toDto(user);
    }

    private PendingUserDto toDto(UserEntity user) {
        List<String> roles = user.getUserRoles().stream()
                .map(r -> r.getRoleType().toUpperCase())
                .toList();
        return new PendingUserDto(
                user.getUserId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getStatus(),
                roles,
                user.getCreatedAt());
    }
}