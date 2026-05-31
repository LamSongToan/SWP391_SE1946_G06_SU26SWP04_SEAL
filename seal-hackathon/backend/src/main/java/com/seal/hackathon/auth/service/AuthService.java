package com.seal.hackathon.auth.service;

import com.seal.hackathon.auth.dto.AuthResponse;
import com.seal.hackathon.auth.dto.LoginRequest;
import com.seal.hackathon.auth.dto.RegisterRequest;
import com.seal.hackathon.auth.dto.RegisterResponse;
import com.seal.hackathon.auth.entity.RoleType;
import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.auth.entity.StudentType;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserRoleEntity;
import com.seal.hackathon.auth.entity.UserStatus;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.auth.security.CustomUserDetailsService;
import com.seal.hackathon.auth.security.JwtService;
import com.seal.hackathon.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Objects;

@Service
public class AuthService {

    private static final String FPT_UNIVERSITY = "FPT University HCMC";

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Value("${app.auth.auto-approve-new-user:false}")
    private boolean autoApproveNewUser;

    public AuthService(UserRepository userRepository,
                       StudentProfileRepository studentProfileRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       CustomUserDetailsService userDetailsService) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new ApiException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }
        validateStudentClassification(request);

        UserEntity user = new UserEntity();
        user.setUsername(request.username().trim().toLowerCase(Locale.ROOT));
        user.setEmail(request.email().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setApproved(autoApproveNewUser);
        user.setStatus(autoApproveNewUser
                ? UserStatus.ACTIVE.getDbValue()
                : UserStatus.PENDING_APPROVAL.getDbValue());

        UserRoleEntity role = new UserRoleEntity();
        role.setUser(user);
        role.setRoleType(RoleType.STUDENT.getDbValue());
        user.getUserRoles().add(role);

        UserEntity savedUser = userRepository.save(user);

        StudentProfileEntity studentProfile = new StudentProfileEntity();
        studentProfile.setUserRole(savedUser.getUserRoles().iterator().next());
        studentProfile.setStudentType(request.studentType().name());
        if (request.studentType() == StudentType.FPT) {
            studentProfile.setStudentCode(request.fptStudentCode().trim());
            studentProfile.setUniversityName(FPT_UNIVERSITY);
        } else {
            studentProfile.setStudentCode(request.externalStudentCode().trim());
            studentProfile.setUniversityName(request.externalUniversity().trim());
        }
        studentProfileRepository.save(studentProfile);

        return new RegisterResponse(
                savedUser.getUserId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getStatus(),
                autoApproveNewUser
                        ? "Registered successfully. Account is approved for immediate login."
                        : "Registered successfully. Account is pending coordinator approval."
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String normalizedUsername = request.username().trim().toLowerCase(Locale.ROOT);
        UserEntity user = userRepository.findByUsernameIgnoreCase(normalizedUsername)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }

        if (!Boolean.TRUE.equals(user.getApproved()) || !UserStatus.ACTIVE.isActiveValue(user.getStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Tài khoản chưa được phê duyệt hoặc đã bị khóa");
        }

        return buildAuthResponse(user);
    }

    private void validateStudentClassification(RegisterRequest request) {
        if (request.studentType() == StudentType.FPT) {
            if (isBlank(request.fptStudentCode())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "fptStudentCode is required for FPT student");
            }
            return;
        }

        if (isBlank(request.externalStudentCode())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "externalStudentCode is required for external student");
        }
        if (isBlank(request.externalUniversity())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "externalUniversity is required for external student");
        }
    }

    private boolean isBlank(String input) {
        return Objects.isNull(input) || input.trim().isEmpty();
    }

    private AuthResponse buildAuthResponse(UserEntity user) {
        List<String> roleNames = userDetailsService.getRoleNames(user);
        UserDetails userDetails = User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash() == null ? "N/A" : user.getPasswordHash())
                .authorities(roleNames.stream().map(name -> "ROLE_" + name).toArray(String[]::new))
                .build();

        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", roleNames);
        claims.put("status", user.getStatus());
        claims.put("username", user.getUsername());
        String token = jwtService.generateToken(userDetails, claims);

        return new AuthResponse(
                token,
                "Bearer",
                jwtService.getJwtExpirationSeconds(),
                user.getEmail(),
                user.getUsername(),
                user.getFullName(),
                user.getStatus(),
                roleNames
        );
    }
}
