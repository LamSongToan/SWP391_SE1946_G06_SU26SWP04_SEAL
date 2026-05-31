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
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

@Service
public class UserProfileService {

    private static final String FPT_UNIVERSITY = "FPT University HCMC";

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRoleRepository userRoleRepository;

    public UserProfileService(UserRepository userRepository,
                              StudentProfileRepository studentProfileRepository,
                              UserRoleRepository userRoleRepository) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.userRoleRepository = userRoleRepository;
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
        user.setFullName(request.fullName().trim());

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
            applyStudentProfileUpdate(studentProfile, request);
            studentProfileRepository.save(studentProfile);
        }

        userRepository.save(user);
        return toProfileDto(user, studentProfile);
    }

    private void applyStudentProfileUpdate(StudentProfileEntity studentProfile, UpdateProfileRequest request) {
        StudentType currentType = StudentType.valueOf(studentProfile.getStudentType().toUpperCase(Locale.ROOT));
        StudentType nextType = request.studentType() != null ? request.studentType() : currentType;
        studentProfile.setStudentType(nextType.name());

        String nextStudentCode = isBlank(request.studentCode()) ? studentProfile.getStudentCode() : request.studentCode().trim();
        if (isBlank(nextStudentCode)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "studentCode is required for student profile");
        }
        studentProfile.setStudentCode(nextStudentCode);

        if (nextType == StudentType.FPT) {
            studentProfile.setUniversityName(FPT_UNIVERSITY);
            return;
        }

        String nextUniversity = isBlank(request.universityName()) ? studentProfile.getUniversityName() : request.universityName().trim();
        if (isBlank(nextUniversity)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "universityName is required when studentType is EXTERNAL");
        }
        studentProfile.setUniversityName(nextUniversity);
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
}
