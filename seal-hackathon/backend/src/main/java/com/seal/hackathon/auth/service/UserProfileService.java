package com.seal.hackathon.auth.service;

import com.seal.hackathon.auth.dto.UpdateProfileRequest;
import com.seal.hackathon.auth.dto.UserProfileDto;
import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.auth.entity.StudentType;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserRoleEntity;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.auth.repository.UserRoleRepository;
import com.seal.hackathon.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class UserProfileService {

    private static final String FPT_UNIVERSITY = "FPT University HCMC";
    private static final String FPT_STUDENT_CODE_REGEX = "^(SE|HE|DE|QE|CE)\\d{6}$";
    private static final long MAX_AVATAR_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_AVATAR_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRoleRepository userRoleRepository;
    private final Path avatarStorageDirectory;

    public UserProfileService(UserRepository userRepository,
                              StudentProfileRepository studentProfileRepository,
                              UserRoleRepository userRoleRepository,
                              @Value("${app.storage.avatar-dir:./uploads/avatars}") String avatarDir) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.userRoleRepository = userRoleRepository;
        this.avatarStorageDirectory = Paths.get(avatarDir).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public UserProfileDto getMyProfile(Authentication authentication) {
        UserEntity user = findByAuthentication(authentication);
        Optional<StudentProfileEntity> studentProfile = studentProfileRepository.findByUserRoleUserUserId(user.getUserId());
        return toProfileDto(user, studentProfile.orElse(null));
    }

    @Transactional
    public UserProfileDto updateMyProfile(Authentication authentication, UpdateProfileRequest request) {
        UserEntity user = findByAuthentication(authentication);
        String normalizedUsername = request.username().trim().toLowerCase(Locale.ROOT);
        if (!normalizedUsername.equalsIgnoreCase(user.getUsername())
                && userRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
            throw new ApiException(HttpStatus.CONFLICT, "Username already exists");
        }

        user.setUsername(normalizedUsername);
        user.setFullName(request.fullName().trim());
        user.setAvatarUrl(normalizeAvatarUrl(request.avatarUrl()));
        user.setBio(normalizeBio(request.bio()));

        Optional<StudentProfileEntity> studentProfileOptional = studentProfileRepository.findByUserRoleUserUserId(user.getUserId());
        boolean hasStudentRole = user.getUserRoles().stream()
                .anyMatch(role -> normalizeRole(role.getRoleType()).equals("STUDENT"));

        if (!hasStudentRole && (request.studentType() != null || !isBlank(request.studentCode()) || !isBlank(request.universityName()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only student accounts can update student profile fields");
        }

        StudentProfileEntity studentProfile = studentProfileOptional.orElse(null);
        if (hasStudentRole) {
            if (studentProfile == null) {
                UserRoleEntity studentRole = userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(user.getUserId(), "Student")
                        .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Student role found but StudentProfile is missing"));
                studentProfile = new StudentProfileEntity();
                studentProfile.setUserRole(studentRole);
            }
            assertStudentIdentityFieldsAreReadonly(studentProfile, request);
        }

        userRepository.save(user);
        return toProfileDto(user, studentProfile);
    }

    @Transactional
    public UserProfileDto uploadAvatar(Authentication authentication, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar image is required");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar image must be 5 MB or smaller");
        }
        if (!ALLOWED_AVATAR_CONTENT_TYPES.contains(Objects.toString(file.getContentType(), "").toLowerCase(Locale.ROOT))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar image must be JPG, PNG, WEBP, or GIF");
        }

        UserEntity user = findByAuthentication(authentication);
        Optional<StudentProfileEntity> studentProfile = studentProfileRepository.findByUserRoleUserUserId(user.getUserId());

        try {
            Files.createDirectories(avatarStorageDirectory);
            String extension = resolveAvatarExtension(file);
            String generatedFilename = "user-" + user.getUserId() + "-" + UUID.randomUUID() + "." + extension;
            Path destination = avatarStorageDirectory.resolve(generatedFilename).normalize();
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            deleteManagedAvatarIfPresent(user.getAvatarUrl());
            user.setAvatarUrl("/uploads/avatars/" + generatedFilename);
            userRepository.saveAndFlush(user);
            return toProfileDto(user, studentProfile.orElse(null));
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store avatar image");
        }
    }

    @Transactional
    public UserProfileDto removeAvatar(Authentication authentication) {
        UserEntity user = findByAuthentication(authentication);
        Optional<StudentProfileEntity> studentProfile = studentProfileRepository.findByUserRoleUserUserId(user.getUserId());
        deleteManagedAvatarIfPresent(user.getAvatarUrl());
        user.setAvatarUrl(null);
        userRepository.saveAndFlush(user);
        return toProfileDto(user, studentProfile.orElse(null));
    }

    private void assertStudentIdentityFieldsAreReadonly(StudentProfileEntity studentProfile, UpdateProfileRequest request) {
        if (request.studentType() != null) {
            String currentType = studentProfile.getStudentType().toUpperCase(Locale.ROOT);
            if (!currentType.equals(request.studentType().name())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Student type cannot be changed after registration");
            }
        }

        if (!isBlank(request.studentCode())) {
            String currentStudentCode = Objects.toString(studentProfile.getStudentCode(), "");
            if (!currentStudentCode.equalsIgnoreCase(request.studentCode().trim())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Student ID cannot be changed after registration");
            }
        }

        if (!isBlank(request.universityName())) {
            String currentUniversityName = Objects.toString(studentProfile.getUniversityName(), "");
            if (!currentUniversityName.equalsIgnoreCase(request.universityName().trim())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "University cannot be changed after registration");
            }
        }
    }

    private UserEntity findByAuthentication(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private UserProfileDto toProfileDto(UserEntity user, StudentProfileEntity studentProfile) {
        List<String> roles = user.getUserRoles().stream()
                .map(role -> normalizeRole(role.getRoleType()))
                .toList();

        return new UserProfileDto(
                user.getUserId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getBio(),
                user.getStatus(),
                user.getApproved(),
                user.getCreatedAt(),
                roles,
                studentProfile == null ? null : studentProfile.getStudentType(),
                studentProfile == null ? null : studentProfile.getStudentCode(),
                studentProfile == null ? null : studentProfile.getUniversityName()
        );
    }

    private String normalizeRole(String dbRoleValue) {
        return dbRoleValue.trim().replace(" ", "_").toUpperCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return Objects.isNull(value) || value.trim().isEmpty();
    }

    private String normalizeAvatarUrl(String avatarUrl) {
        if (isBlank(avatarUrl)) {
            return null;
        }

        String normalized = avatarUrl.trim();
        if (normalized.startsWith("/uploads/avatars/")) {
            return normalized;
        }

        try {
            URI uri = URI.create(normalized);
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                throw new IllegalArgumentException("Unsupported avatar URL scheme");
            }
            if (isBlank(uri.getHost())) {
                throw new IllegalArgumentException("Avatar URL host is missing");
            }
            return normalized;
        } catch (RuntimeException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar URL must be a valid http or https URL");
        }
    }

    private String normalizeBio(String bio) {
        if (bio == null) {
            return null;
        }
        String normalized = bio.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String resolveAvatarExtension(MultipartFile file) {
        String originalFilename = StringUtils.cleanPath(Objects.toString(file.getOriginalFilename(), ""));
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > -1 && dotIndex < originalFilename.length() - 1) {
            return originalFilename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
        }

        return switch (Objects.toString(file.getContentType(), "").toLowerCase(Locale.ROOT)) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "image/gif" -> "gif";
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar image must be JPG, PNG, WEBP, or GIF");
        };
    }

    private void deleteManagedAvatarIfPresent(String avatarUrl) {
        if (isBlank(avatarUrl) || !avatarUrl.startsWith("/uploads/avatars/")) {
            return;
        }

        String filename = avatarUrl.substring("/uploads/avatars/".length());
        if (filename.contains("/") || filename.contains("\\") || filename.contains("..")) {
            return;
        }

        try {
            Files.deleteIfExists(avatarStorageDirectory.resolve(filename).normalize());
        } catch (IOException ignored) {
            // best effort cleanup only
        }
    }
}
