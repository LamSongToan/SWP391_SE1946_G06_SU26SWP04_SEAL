package com.seal.hackathon.auth.service;

import com.seal.hackathon.auth.dto.PendingUserDto;
import com.seal.hackathon.auth.dto.UpdateManagedUserRequest;
import com.seal.hackathon.auth.entity.RoleType;
import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserStatus;
import com.seal.hackathon.auth.entity.UserRoleEntity;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.evaluation.service.AuditLogService;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.seal.hackathon.auth.dto.MentorOptionDto;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AccountApprovalService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final AccountApprovalNotificationService accountApprovalNotificationService;
    private final AuditLogService auditLogService;

    public AccountApprovalService(UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            AccountApprovalNotificationService accountApprovalNotificationService,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.accountApprovalNotificationService = accountApprovalNotificationService;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<PendingUserDto> listPendingUsers() {
        return userRepository.findByStatusIn(List.of(
                UserStatus.PENDING_APPROVAL.getDbValue(),
                "PENDING",
                "Pending"),
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

    @Transactional(readOnly = true)
    public PendingUserDto getUserById(Integer userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return toDto(user);
    }

    @Transactional
    public PendingUserDto processAction(Integer userId, String action, String reason) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        PendingUserDto previous = toDto(user);
        UserStatus currentStatus = UserStatus.from(user.getStatus());
        boolean sendApprovedEmail = false;
        String auditAction;

        switch (normalizeAction(action)) {
            case "ACTIVE" -> {
                if (currentStatus != UserStatus.PENDING_APPROVAL) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Only PendingApproval accounts can be activated. Current status: " + user.getStatus());
                }
                user.setStatus(UserStatus.ACTIVE.getDbValue());
                user.setApproved(true);
                user.setRejectionReason(null);
                sendApprovedEmail = true;
                auditAction = "ACCOUNT_APPROVED";
            }
            case "REJECTED" -> {
                if (currentStatus != UserStatus.PENDING_APPROVAL) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Only PendingApproval accounts can be rejected. Current status: " + user.getStatus());
                }
                if (isBlank(reason)) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Reject reason is required");
                }
                user.setStatus(UserStatus.REJECTED.getDbValue());
                user.setApproved(false);
                user.setRejectionReason(reason.trim());
                accountApprovalNotificationService.sendRejectedEmail(user, reason.trim());
                auditAction = "ACCOUNT_REJECTED";
            }
            case "PENDING_APPROVAL" -> {
                if (currentStatus != UserStatus.REJECTED) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Only Rejected accounts can be moved back to PendingApproval. Current status: "
                                    + user.getStatus());
                }
                user.setStatus(UserStatus.PENDING_APPROVAL.getDbValue());
                user.setApproved(false);
                user.setRejectionReason(null);
                auditAction = "ACCOUNT_RESUBMITTED";
            }
            case "SUSPENDED" -> {
                if (currentStatus != UserStatus.ACTIVE) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Only Active accounts can be suspended. Current status: " + user.getStatus());
                }
                user.setStatus(UserStatus.SUSPENDED.getDbValue());
                user.setApproved(false);
                auditAction = "ACCOUNT_SUSPENDED";
            }
            default -> throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Invalid action. Allowed: ACTIVE, REJECTED, PENDING_APPROVAL, SUSPENDED");
        }

        userRepository.save(user);
        PendingUserDto updated = toDto(user);
        auditLogService.record(
                auditAction,
                "USER",
                user.getUserId(),
                user.getFullName(),
                previous,
                updated,
                isBlank(reason) ? null : reason.trim()
        );
        if (sendApprovedEmail) {
            accountApprovalNotificationService.sendApprovedEmail(user);
        }
        return updated;
    }

    @Transactional(readOnly = true)
    public List<MentorOptionDto> listMentors() {
        return userRepository.findAll()
                .stream()
                .filter(u -> "ACTIVE".equals(normalizeStatus(u.getStatus())))
                .flatMap(u -> u.getUserRoles().stream()
                        .filter(role -> "MENTOR".equals(normalizeRole(role.getRoleType())))
                        .map(role -> new MentorOptionDto(
                                role.getUserRoleId(), // ✅ the real userRoleId
                                u.getFullName() != null ? u.getFullName() : u.getUsername(),
                                u.getEmail())))
                .toList();
    }

    private String normalizeStatus(String s) {
        return s == null ? "" : s.trim().replace(" ", "_").toUpperCase(Locale.ROOT);
    }

    @Transactional
    public PendingUserDto updateManagedUser(Integer userId, UpdateManagedUserRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        PendingUserDto previous = toDto(user);

        String normalizedUsername = request.username().trim().toLowerCase(Locale.ROOT);
        if (!normalizedUsername.equalsIgnoreCase(user.getUsername())
                && userRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
            throw new ApiException(HttpStatus.CONFLICT, "Username already exists");
        }

        UserStatus nextStatus = parseStatus(request.status());
        UserStatus currentStatus = UserStatus.from(user.getStatus());
        boolean sendApprovedEmail = currentStatus == UserStatus.PENDING_APPROVAL && nextStatus == UserStatus.ACTIVE;
        Set<String> nextRoles = normalizeRoles(request.roles());

        if (nextStatus == UserStatus.REJECTED && currentStatus != UserStatus.REJECTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Use the reject action to reject an account because a rejection reason is required");
        }

        boolean hasStudentProfile = studentProfileRepository.findByUserRoleUserUserId(userId).isPresent();
        if (hasStudentProfile && !nextRoles.contains(RoleType.STUDENT.name())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot remove STUDENT role while student profile exists");
        }
        if (!hasStudentProfile && nextRoles.contains(RoleType.STUDENT.name())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot add STUDENT role without student profile");
        }

        user.setUsername(normalizedUsername);
        user.setFullName(request.fullName().trim());
        user.setStatus(nextStatus.getDbValue());
        user.setApproved(nextStatus == UserStatus.ACTIVE);
        if (nextStatus != UserStatus.REJECTED) {
            user.setRejectionReason(null);
        }

        Map<String, UserRoleEntity> existingRoleMap = user.getUserRoles().stream()
                .collect(Collectors.toMap(
                        role -> normalizeRole(role.getRoleType()),
                        role -> role,
                        (a, b) -> a));

        user.getUserRoles().removeIf(role -> !nextRoles.contains(normalizeRole(role.getRoleType())));
        for (String nextRole : nextRoles) {
            if (existingRoleMap.containsKey(nextRole))
                continue;
            UserRoleEntity userRole = new UserRoleEntity();
            userRole.setUser(user);
            userRole.setRoleType(roleTypeToDbValue(nextRole));
            user.getUserRoles().add(userRole);
        }

        userRepository.save(user);
        PendingUserDto updated = toDto(user);
        auditLogService.record(
                "USER_UPDATED",
                "USER",
                user.getUserId(),
                user.getFullName(),
                previous,
                updated,
                "Coordinator updated managed account details"
        );
        if (sendApprovedEmail) {
            accountApprovalNotificationService.sendApprovedEmail(user);
        }
        return updated;
    }

    private PendingUserDto toDto(UserEntity user) {
        List<String> roles = user.getUserRoles().stream()
                .map(r -> normalizeRole(r.getRoleType()))
                .toList();
        StudentProfileEntity studentProfile = studentProfileRepository.findByUserRoleUserUserId(user.getUserId())
                .orElse(null);
        return new PendingUserDto(
                user.getUserId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getStatus(),
                roles,
                user.getCreatedAt(),
                studentProfile != null ? studentProfile.getStudentType() : null,
                studentProfile != null ? studentProfile.getStudentCode() : null,
                studentProfile != null ? studentProfile.getUniversityName() : null,
                user.getRejectionReason());
    }

    private UserStatus parseStatus(String rawStatus) {
        try {
            return UserStatus.from(rawStatus);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Invalid status. Allowed: PendingApproval, Active, Rejected, Suspended");
        }
    }

    private String normalizeAction(String action) {
        String normalized = action == null ? "" : action.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "APPROVED" -> "ACTIVE";
            case "PENDING" -> "PENDING_APPROVAL";
            case "DISABLED" -> "SUSPENDED";
            default -> normalized;
        };
    }

    private boolean isBlank(String input) {
        return input == null || input.trim().isEmpty();
    }

    private Set<String> normalizeRoles(List<String> roles) {
        Set<String> normalized = roles.stream()
                .map(role -> role == null ? "" : role.trim().toUpperCase(Locale.ROOT))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (normalized.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "roles must not be empty");
        }
        for (String role : normalized) {
            try {
                RoleType.valueOf(role);
            } catch (Exception ex) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Invalid role '" + role + "'. Allowed: " + Arrays.toString(RoleType.values()));
            }
        }
        return normalized;
    }

    private String roleTypeToDbValue(String roleName) {
        return RoleType.valueOf(roleName).getDbValue();
    }

    private String normalizeRole(String roleType) {
        return roleType.trim().replace(" ", "_").toUpperCase(Locale.ROOT);
    }
}
