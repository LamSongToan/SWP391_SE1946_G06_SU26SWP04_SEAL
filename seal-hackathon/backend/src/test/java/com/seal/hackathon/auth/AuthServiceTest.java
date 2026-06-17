package com.seal.hackathon.auth;

import com.seal.hackathon.auth.dto.GoogleLoginRequest;
import com.seal.hackathon.auth.dto.LoginRequest;
import com.seal.hackathon.auth.dto.RejectedLoginPayload;
import com.seal.hackathon.auth.dto.RejectedRegistrationResubmitRequest;
import com.seal.hackathon.auth.dto.RegisterRequest;
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
import com.seal.hackathon.auth.service.AuthService;
import com.seal.hackathon.auth.service.GoogleIdentityService;
import com.seal.hackathon.auth.service.RegistrationOtpService;
import com.seal.hackathon.common.ApiException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private StudentProfileRepository studentProfileRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private CustomUserDetailsService userDetailsService;
    @Mock
    private GoogleIdentityService googleIdentityService;
    @Mock
    private RegistrationOtpService registrationOtpService;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(authService, "autoApproveNewUser", false);
    }

    @Test
    void register_shouldRejectMissingFptCode() {
        RegisterRequest request = new RegisterRequest(
                "an.user", "a@gmail.com", "12345678", "123456", "An", StudentType.FPT,
                null, null, null
        );
        when(registrationOtpService.requireValidOtp("a@gmail.com", "123456")).thenReturn(validOtp());

        ApiException ex = Assertions.assertThrows(ApiException.class, () -> authService.register(request));
        Assertions.assertTrue(ex.getMessage().contains("fptStudentCode"));
    }

    @Test
    void register_shouldRejectInvalidFptStudentCodeFormat() {
        RegisterRequest request = new RegisterRequest(
                "an.user", "a@gmail.com", "Seal@2026", "123456", "An", StudentType.FPT,
                "AB123456", null, null
        );
        when(registrationOtpService.requireValidOtp("a@gmail.com", "123456")).thenReturn(validOtp());
        when(userRepository.existsByUsernameIgnoreCase("an.user")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("a@gmail.com")).thenReturn(false);

        ApiException ex = Assertions.assertThrows(ApiException.class, () -> authService.register(request));
        Assertions.assertTrue(ex.getMessage().contains("FPT student code must have 8 characters"));
    }

    @Test
    void register_shouldRejectDuplicateFptStudentCode() {
        RegisterRequest request = new RegisterRequest(
                "an.user", "a@gmail.com", "Seal@2026", "123456", "An", StudentType.FPT,
                "SE123456", null, null
        );
        when(registrationOtpService.requireValidOtp("a@gmail.com", "123456")).thenReturn(validOtp());
        when(userRepository.existsByUsernameIgnoreCase("an.user")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("a@gmail.com")).thenReturn(false);
        when(studentProfileRepository.existsByStudentCodeIgnoreCaseAndUniversityNameIgnoreCase(
                "SE123456", "FPT University HCMC")).thenReturn(true);

        ApiException ex = Assertions.assertThrows(ApiException.class, () -> authService.register(request));
        Assertions.assertTrue(ex.getMessage().contains("already exists"));
    }

    @Test
    void register_shouldSetPendingWhenAutoApproveDisabled() {
        RegisterRequest request = new RegisterRequest(
                "an.user", "a@gmail.com", "12345678", "123456", "An", StudentType.FPT,
                "SE180000", null, null
        );
        RegistrationOtpEntity otpEntity = validOtp();
        when(registrationOtpService.requireValidOtp("a@gmail.com", "123456")).thenReturn(otpEntity);
        when(userRepository.existsByUsernameIgnoreCase("an.user")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("a@gmail.com")).thenReturn(false);
        when(passwordEncoder.encode("12345678")).thenReturn("hash");
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> {
            UserEntity user = invocation.getArgument(0);
            user.setUserId(1);
            return user;
        });

        var response = authService.register(request);
        Assertions.assertEquals("PendingApproval", response.status());
    }

    @Test
    void login_shouldRejectUnapprovedUser() {
        UserEntity user = new UserEntity();
        user.setUsername("an.user");
        user.setEmail("a@fpt.edu.vn");
        user.setPasswordHash("hash");
        user.setStatus(UserStatus.PENDING_APPROVAL.getDbValue());
        user.setApproved(false);

        UserRoleEntity roleEntity = new UserRoleEntity();
        roleEntity.setRoleType(RoleType.STUDENT.getDbValue());
        Set<UserRoleEntity> roles = new HashSet<>();
        roles.add(roleEntity);
        user.setUserRoles(roles);

        when(userRepository.findByEmailIgnoreCase("a@fpt.edu.vn")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("12345678", "hash")).thenReturn(true);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> authService.login(new LoginRequest("a@fpt.edu.vn", "12345678")));
        Assertions.assertTrue(ex.getMessage().contains("waiting for administrator approval"));
    }

    @Test
    void login_shouldReturnRejectReasonForRejectedUser() {
        UserEntity user = new UserEntity();
        user.setUserId(44);
        user.setUsername("an.user");
        user.setEmail("a@fpt.edu.vn");
        user.setPasswordHash("hash");
        user.setStatus(UserStatus.REJECTED.getDbValue());
        user.setApproved(false);
        user.setRejectionReason("Student code does not match the submitted university.");

        UserRoleEntity roleEntity = new UserRoleEntity();
        roleEntity.setRoleType(RoleType.STUDENT.getDbValue());
        Set<UserRoleEntity> roles = new HashSet<>();
        roles.add(roleEntity);
        user.setUserRoles(roles);

        when(userRepository.findByEmailIgnoreCase("a@fpt.edu.vn")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("12345678", "hash")).thenReturn(true);
        when(jwtService.generateToken(eq("a@fpt.edu.vn"), any(), anyLong())).thenReturn("resubmit-token");

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> authService.login(new LoginRequest("a@fpt.edu.vn", "12345678")));
        Assertions.assertEquals("Account request was rejected.", ex.getMessage());
        Assertions.assertInstanceOf(RejectedLoginPayload.class, ex.getData());
        RejectedLoginPayload payload = (RejectedLoginPayload) ex.getData();
        Assertions.assertTrue(payload.rejectionReason().contains("Student code does not match"));
        Assertions.assertEquals("resubmit-token", payload.resubmitToken());
    }

    @Test
    void resubmitRejectedRegistration_shouldMoveUserBackToPendingApproval() {
        UserEntity user = new UserEntity();
        user.setUserId(45);
        user.setUsername("an.user");
        user.setEmail("a@fpt.edu.vn");
        user.setFullName("An");
        user.setStatus(UserStatus.REJECTED.getDbValue());
        user.setApproved(false);
        user.setRejectionReason("Need better student code proof");

        StudentProfileEntity studentProfile = new StudentProfileEntity();
        studentProfile.setStudentType(StudentType.FPT.name());
        studentProfile.setStudentCode("SE180001");
        studentProfile.setUniversityName("FPT University HCMC");

        when(jwtService.extractAllClaims("resubmit-token")).thenReturn(io.jsonwebtoken.Jwts.claims()
                .setSubject("a@fpt.edu.vn"));
        when(jwtService.isTokenExpired("resubmit-token")).thenReturn(false);
        when(userRepository.findById(45)).thenReturn(Optional.of(user));
        when(studentProfileRepository.findByUserRoleUserUserId(45)).thenReturn(Optional.of(studentProfile));
        when(userRepository.existsByUsernameIgnoreCase("an.updated")).thenReturn(false);
        when(studentProfileRepository.existsByStudentCodeIgnoreCaseAndUniversityNameIgnoreCaseAndUserRoleUserUserIdNot(
                "SE180002", "FPT University HCMC", 45)).thenReturn(false);

        io.jsonwebtoken.Claims claims = io.jsonwebtoken.Jwts.claims()
                .setSubject("a@fpt.edu.vn");
        claims.put("purpose", "REJECTED_RESUBMIT");
        claims.put("userId", 45);
        when(jwtService.extractAllClaims("resubmit-token")).thenReturn(claims);

        var response = authService.resubmitRejectedRegistration(new RejectedRegistrationResubmitRequest(
                "resubmit-token",
                "an.updated",
                "An Updated",
                StudentType.FPT,
                "SE180002",
                null,
                null
        ));

        Assertions.assertEquals(UserStatus.PENDING_APPROVAL.getDbValue(), user.getStatus());
        Assertions.assertFalse(user.getApproved());
        Assertions.assertNull(user.getRejectionReason());
        Assertions.assertEquals("an.updated", user.getUsername());
        Assertions.assertEquals("An Updated", user.getFullName());
        Assertions.assertEquals("SE180002", studentProfile.getStudentCode());
        Assertions.assertEquals(UserStatus.PENDING_APPROVAL.getDbValue(), response.status());
    }

    @Test
    void googleLogin_shouldRequireRegistrationWhenEmailDoesNotExist() {
        when(googleIdentityService.verifyIdToken("google-token"))
                .thenReturn(new GoogleIdentityService.GoogleUserProfile(
                        "new.student@gmail.com",
                        "New Student",
                        "https://example.com/avatar.png"
                ));
        when(userRepository.findByEmailIgnoreCase("new.student@gmail.com")).thenReturn(Optional.empty());

        var response = authService.loginWithGoogle(new GoogleLoginRequest("google-token"));

        Assertions.assertTrue(response.registrationRequired());
        Assertions.assertNull(response.auth());
        Assertions.assertEquals("new.student@gmail.com", response.email());
    }

    private RegistrationOtpEntity validOtp() {
        RegistrationOtpEntity entity = new RegistrationOtpEntity();
        entity.setId(1);
        entity.setEmail("a@gmail.com");
        return entity;
    }
}
