package com.seal.hackathon.auth;

import com.seal.hackathon.auth.dto.GoogleLoginRequest;
import com.seal.hackathon.auth.dto.LoginRequest;
import com.seal.hackathon.auth.dto.RegisterRequest;
import com.seal.hackathon.auth.entity.RoleType;
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

import static org.mockito.ArgumentMatchers.any;
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

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(authService, "autoApproveNewUser", false);
    }

    @Test
    void register_shouldRejectMissingFptCode() {
        RegisterRequest request = new RegisterRequest(
                "an.user", "a@gmail.com", "12345678", "An", StudentType.FPT,
                null, null, null
        );

        ApiException ex = Assertions.assertThrows(ApiException.class, () -> authService.register(request));
        Assertions.assertTrue(ex.getMessage().contains("fptStudentCode"));
    }

    @Test
    void register_shouldRejectInvalidFptStudentCodeFormat() {
        RegisterRequest request = new RegisterRequest(
                "an.user", "a@gmail.com", "Seal@2026", "An", StudentType.FPT,
                "AB123456", null, null
        );
        when(userRepository.existsByUsernameIgnoreCase("an.user")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("a@gmail.com")).thenReturn(false);

        ApiException ex = Assertions.assertThrows(ApiException.class, () -> authService.register(request));
        Assertions.assertTrue(ex.getMessage().contains("FPT student code must have 8 characters"));
    }

    @Test
    void register_shouldRejectDuplicateFptStudentCode() {
        RegisterRequest request = new RegisterRequest(
                "an.user", "a@gmail.com", "Seal@2026", "An", StudentType.FPT,
                "SE123456", null, null
        );
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
                "an.user", "a@gmail.com", "12345678", "An", StudentType.FPT,
                "SE180000", null, null
        );
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

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> authService.login(new LoginRequest("a@fpt.edu.vn", "12345678")));
        Assertions.assertTrue(ex.getMessage().contains("Student code does not match"));
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
}
