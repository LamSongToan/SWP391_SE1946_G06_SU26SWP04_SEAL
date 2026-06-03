package com.seal.hackathon.auth.service;

import com.seal.hackathon.auth.dto.UserDirectoryProfileDto;
import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

@Service
public class UserDirectoryService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;

    public UserDirectoryService(UserRepository userRepository,
                                StudentProfileRepository studentProfileRepository) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    @Transactional(readOnly = true)
    public List<UserDirectoryProfileDto> searchUsers(Authentication authentication, String query) {
        UserEntity currentUser = findCurrentUser(authentication);
        boolean coordinator = hasRole(currentUser, "COORDINATOR");
        String normalizedQuery = normalizeQuery(query);

        if (normalizedQuery.isBlank()) {
            return List.of();
        }

        return userRepository.findAll(Sort.by(Sort.Direction.ASC, "fullName", "username"))
                .stream()
                .filter(user -> !Objects.equals(user.getUserId(), currentUser.getUserId()))
                .filter(user -> coordinator || isPubliclyVisible(user))
                .map(user -> toDto(user, studentProfileRepository.findByUserRoleUserUserId(user.getUserId()).orElse(null)))
                .filter(dto -> matchesQuery(dto, normalizedQuery))
                .limit(30)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserDirectoryProfileDto getUserProfile(Authentication authentication, Integer userId) {
        UserEntity currentUser = findCurrentUser(authentication);
        boolean coordinator = hasRole(currentUser, "COORDINATOR");

        UserEntity targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (!coordinator && !isPubliclyVisible(targetUser)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This user is not available in the public directory");
        }

        return toDto(targetUser, studentProfileRepository.findByUserRoleUserUserId(targetUser.getUserId()).orElse(null));
    }

    private UserEntity findCurrentUser(Authentication authentication) {
        if (authentication == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private boolean hasRole(UserEntity user, String role) {
        return user.getUserRoles().stream()
                .anyMatch(userRole -> normalizeRole(userRole.getRoleType()).equals(role));
    }

    private boolean isPubliclyVisible(UserEntity user) {
        return Boolean.TRUE.equals(user.getApproved()) && "ACTIVE".equals(normalizeStatus(user.getStatus()));
    }

    private UserDirectoryProfileDto toDto(UserEntity user, StudentProfileEntity studentProfile) {
        return new UserDirectoryProfileDto(
                user.getUserId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getBio(),
                user.getStatus(),
                user.getApproved(),
                user.getCreatedAt(),
                user.getUserRoles().stream().map(role -> normalizeRole(role.getRoleType())).toList(),
                studentProfile == null ? null : studentProfile.getStudentType(),
                studentProfile == null ? null : studentProfile.getUniversityName()
        );
    }

    private boolean matchesQuery(UserDirectoryProfileDto dto, String normalizedQuery) {
        return contains(dto.fullName(), normalizedQuery)
                || contains(dto.username(), normalizedQuery)
                || contains(dto.email(), normalizedQuery)
                || contains(dto.universityName(), normalizedQuery)
                || dto.roles().stream().anyMatch(role -> contains(role, normalizedQuery));
    }

    private boolean contains(String value, String normalizedQuery) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(normalizedQuery);
    }

    private String normalizeQuery(String query) {
        return query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeRole(String dbRoleValue) {
        return dbRoleValue.trim().replace(" ", "_").toUpperCase(Locale.ROOT);
    }

    private String normalizeStatus(String dbStatusValue) {
        return dbStatusValue == null ? "" : dbStatusValue.trim().replace(" ", "_").toUpperCase(Locale.ROOT);
    }
}
