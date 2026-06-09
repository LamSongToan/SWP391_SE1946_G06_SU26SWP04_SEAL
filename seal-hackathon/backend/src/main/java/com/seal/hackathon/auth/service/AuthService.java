package com.seal.hackathon.auth.service;

import com.seal.hackathon.auth.dto.AuthResponse;
import com.seal.hackathon.auth.dto.GoogleLoginRequest;
import com.seal.hackathon.auth.dto.GoogleLoginResponse;
import com.seal.hackathon.auth.dto.GoogleRegisterRequest;
import com.seal.hackathon.auth.dto.LoginRequest;
import com.seal.hackathon.auth.dto.RegistrationOtpRequest;
import com.seal.hackathon.auth.dto.RegistrationOtpResponse;
import com.seal.hackathon.auth.dto.RegisterRequest;
import com.seal.hackathon.auth.dto.RegisterResponse;
import com.seal.hackathon.auth.entity.RegistrationOtpEntity;
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
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class AuthService {

    private static final String FPT_UNIVERSITY = "FPT University HCMC";
    private static final String FPT_STUDENT_CODE_REGEX = "^(SE|HE|DE|QE|CE)\\d{6}$";

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final GoogleIdentityService googleIdentityService;
    private final RegistrationOtpService registrationOtpService;

    @Value("${app.auth.auto-approve-new-user:false}")
    private boolean autoApproveNewUser;

    public AuthService(UserRepository userRepository,
                       StudentProfileRepository studentProfileRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       CustomUserDetailsService userDetailsService,
                       GoogleIdentityService googleIdentityService,
                       RegistrationOtpService registrationOtpService) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.googleIdentityService = googleIdentityService;
        this.registrationOtpService = registrationOtpService;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        RegistrationOtpEntity otpEntity = registrationOtpService.requireValidOtp(request.email(), request.otp());
        RegisterResponse response = registerStudentAccount(
                request.username(),
                request.email(),
                request.password(),
                request.fullName(),
                request.studentType(),
                request.fptStudentCode(),
                request.externalStudentCode(),
                request.externalUniversity(),
                false
        );
        registrationOtpService.markUsed(otpEntity);
        return response;
    }

    @Transactional
    public RegistrationOtpResponse sendRegistrationOtp(RegistrationOtpRequest request) {
        return registrationOtpService.sendOtp(request.email());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        UserEntity user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        ensureAccountCanLogin(user);

        return buildAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public GoogleLoginResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleIdentityService.GoogleUserProfile googleUser = googleIdentityService.verifyIdToken(request.idToken());
        UserEntity user = userRepository.findByEmailIgnoreCase(googleUser.email()).orElse(null);

        if (user == null) {
            return new GoogleLoginResponse(
                    true,
                    null,
                    googleUser.email(),
                    googleUser.fullName(),
                    googleUser.pictureUrl()
            );
        }

        ensureAccountCanLogin(user);

        return new GoogleLoginResponse(
                false,
                buildAuthResponse(user),
                user.getEmail(),
                user.getFullName(),
                googleUser.pictureUrl()
        );
    }

    @Transactional
    public RegisterResponse registerWithGoogle(GoogleRegisterRequest request) {
        GoogleIdentityService.GoogleUserProfile googleUser = googleIdentityService.verifyIdToken(request.idToken());
        return registerStudentAccount(
                request.username(),
                googleUser.email(),
                request.password(),
                request.fullName(),
                request.studentType(),
                request.fptStudentCode(),
                request.externalStudentCode(),
                request.externalUniversity(),
                true
        );
    }

    private RegisterResponse registerStudentAccount(String username,
                                                   String email,
                                                   String rawPassword,
                                                   String fullName,
                                                   StudentType studentType,
                                                   String fptStudentCode,
                                                   String externalStudentCode,
                                                   String externalUniversity,
                                                   boolean googleRegistration) {
        String normalizedUsername = normalizeUsername(username);
        String normalizedEmail = normalizeEmail(email);

        if (userRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
            throw new ApiException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }

        validateStudentClassification(studentType, fptStudentCode, externalStudentCode, externalUniversity);

        UserEntity user = new UserEntity();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName(fullName.trim());
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
        studentProfile.setStudentType(studentType.name());
        if (studentType == StudentType.FPT) {
            studentProfile.setStudentCode(normalizeFptStudentCode(fptStudentCode));
            studentProfile.setUniversityName(FPT_UNIVERSITY);
        } else {
            studentProfile.setStudentCode(externalStudentCode.trim());
            studentProfile.setUniversityName(externalUniversity.trim());
        }
        studentProfileRepository.save(studentProfile);

        String successMessage;
        if (autoApproveNewUser) {
            successMessage = googleRegistration
                    ? "Registered successfully. Continue with Google sign-in."
                    : "Registered successfully. Account is approved for immediate login.";
        } else {
            successMessage = googleRegistration
                    ? "Registered successfully. Account is pending coordinator approval. Continue with Google sign-in after approval."
                    : "Registered successfully. Account is pending coordinator approval.";
        }

        return new RegisterResponse(
                savedUser.getUserId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getStatus(),
                successMessage
        );
    }

    private void validateStudentClassification(StudentType studentType,
                                               String fptStudentCode,
                                               String externalStudentCode,
                                               String externalUniversity) {
        if (studentType == StudentType.FPT) {
            if (isBlank(fptStudentCode)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "fptStudentCode is required for FPT student");
            }
            String normalizedCode = normalizeFptStudentCode(fptStudentCode);
            if (!normalizedCode.matches(FPT_STUDENT_CODE_REGEX)) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "FPT student code must have 8 characters: campus code (SE, HE, DE, QE, CE) followed by 6 digits");
            }
            if (studentProfileRepository.existsByStudentCodeIgnoreCaseAndUniversityNameIgnoreCase(
                    normalizedCode, FPT_UNIVERSITY)) {
                throw new ApiException(HttpStatus.CONFLICT, "Student ID already exists in FPT University HCMC");
            }
            return;
        }

        if (isBlank(externalStudentCode)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "externalStudentCode is required for external student");
        }
        if (isBlank(externalUniversity)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "externalUniversity is required for external student");
        }
        String normalizedExternalCode = externalStudentCode.trim();
        String normalizedExternalUniversity = externalUniversity.trim();
        if (studentProfileRepository.existsByStudentCodeIgnoreCaseAndUniversityNameIgnoreCase(
                normalizedExternalCode, normalizedExternalUniversity)) {
            throw new ApiException(HttpStatus.CONFLICT, "Student ID already exists in the selected university");
        }
    }

    private boolean isBlank(String input) {
        return Objects.isNull(input) || input.trim().isEmpty();
    }

    private String normalizeUsername(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeFptStudentCode(String studentCode) {
        return studentCode.trim().toUpperCase(Locale.ROOT);
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

    private void ensureAccountCanLogin(UserEntity user) {
        UserStatus status = UserStatus.from(user.getStatus());
        if (Boolean.TRUE.equals(user.getApproved()) && status == UserStatus.ACTIVE) {
            return;
        }

        if (status == UserStatus.REJECTED) {
            String reason = user.getRejectionReason();
            String message = isBlank(reason)
                    ? "Account request was rejected."
                    : "Account request was rejected. Reason: " + reason.trim();
            throw new ApiException(HttpStatus.FORBIDDEN, message);
        }

        if (status == UserStatus.PENDING_APPROVAL) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Account is waiting for administrator approval.");
        }

        if (status == UserStatus.SUSPENDED) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Account is suspended. Please contact the Event Coordinator.");
        }

        throw new ApiException(HttpStatus.FORBIDDEN, "Account is not allowed to sign in.");
    }
}
