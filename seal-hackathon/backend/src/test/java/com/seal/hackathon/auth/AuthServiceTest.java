package com.seal.hackathon.auth;

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
        Assertions.assertEquals("PENDING", response.status());
    }

    @Test
    void login_shouldRejectUnapprovedUser() {
        UserEntity user = new UserEntity();
        user.setUsername("an.user");
        user.setEmail("a@fpt.edu.vn");
        user.setPasswordHash("hash");
        user.setStatus(UserStatus.PENDING.name());
        user.setApproved(false);

        UserRoleEntity roleEntity = new UserRoleEntity();
        roleEntity.setRoleType(RoleType.STUDENT.getDbValue());
        Set<UserRoleEntity> roles = new HashSet<>();
        roles.add(roleEntity);
        user.setUserRoles(roles);

        when(userRepository.findByUsernameIgnoreCase("an.user")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("12345678", "hash")).thenReturn(true);

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> authService.login(new LoginRequest("an.user", "12345678")));
        Assertions.assertTrue(ex.getMessage().contains("not been approved"));
    }
}
