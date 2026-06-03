package com.seal.hackathon.auth;

import com.seal.hackathon.auth.dto.ForgotPasswordResponse;
import com.seal.hackathon.auth.entity.PasswordResetTokenEntity;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.PasswordResetTokenRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.auth.service.PasswordService;
import com.seal.hackathon.common.ApiException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Properties;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordResetTokenRepository resetTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private PasswordService passwordService;

    @Test
    void forgotPassword_shouldSendOtpEmailAndPersistHashedOtp() throws Exception {
        UserEntity user = new UserEntity();
        user.setUserId(1);
        user.setEmail("student@gmail.com");
        user.setFullName("Student A");

        when(userRepository.findByEmailIgnoreCase("student@gmail.com")).thenReturn(Optional.of(user));
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));

        ReflectionTestUtils.setField(passwordService, "mailHost", "smtp.gmail.com");
        ReflectionTestUtils.setField(passwordService, "mailFrom", "seal@gmail.com");
        ReflectionTestUtils.setField(passwordService, "resetOtpExpiryMinutes", 10L);

        ForgotPasswordResponse response = passwordService.forgotPassword("student@gmail.com");

        Assertions.assertEquals("A password reset OTP has been sent to your email.", response.message());
        Assertions.assertEquals(10L, response.expiresInMinutes());

        ArgumentCaptor<PasswordResetTokenEntity> tokenCaptor = ArgumentCaptor.forClass(PasswordResetTokenEntity.class);
        verify(resetTokenRepository).save(tokenCaptor.capture());
        Assertions.assertNotNull(tokenCaptor.getValue().getToken());
        Assertions.assertEquals(64, tokenCaptor.getValue().getToken().length());

        ArgumentCaptor<MimeMessage> mailCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(mailCaptor.capture());
        Assertions.assertEquals("student@gmail.com", mailCaptor.getValue().getAllRecipients()[0].toString());
        Assertions.assertEquals("SEAL Hackathon password reset verification code", mailCaptor.getValue().getSubject());
        Assertions.assertTrue(mailCaptor.getValue().getContent().toString().contains("Verification Code"));
    }

    @Test
    void forgotPassword_shouldRejectUnregisteredEmail() {
        when(userRepository.findByEmailIgnoreCase("missing@gmail.com")).thenReturn(Optional.empty());

        ApiException exception = Assertions.assertThrows(
                ApiException.class,
                () -> passwordService.forgotPassword("missing@gmail.com")
        );

        Assertions.assertEquals("Email is not registered", exception.getMessage());
        verify(resetTokenRepository, never()).save(any());
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void resetPassword_shouldUpdatePasswordWhenOtpMatches() {
        UserEntity user = new UserEntity();
        user.setUserId(2);
        user.setEmail("student@gmail.com");
        user.setPasswordHash("old");

        PasswordResetTokenEntity token = new PasswordResetTokenEntity();
        token.setUser(user);
        token.setToken("8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"); // sha256("123456")
        token.setUsed(false);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(5));

        when(userRepository.findByEmailIgnoreCase("student@gmail.com")).thenReturn(Optional.of(user));
        when(resetTokenRepository.findTopByUserUserIdAndUsedFalseOrderByCreatedAtDesc(2)).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("Seal@2027")).thenReturn("encoded");

        passwordService.resetPassword("student@gmail.com", "123456", "Seal@2027");

        Assertions.assertEquals("encoded", user.getPasswordHash());
        Assertions.assertTrue(token.getUsed());
        verify(userRepository).save(user);
        verify(resetTokenRepository).save(token);
    }

    @Test
    void resetPassword_shouldRejectWrongOtp() {
        UserEntity user = new UserEntity();
        user.setUserId(3);
        user.setEmail("student@gmail.com");

        PasswordResetTokenEntity token = new PasswordResetTokenEntity();
        token.setUser(user);
        token.setToken("8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"); // sha256("123456")
        token.setUsed(false);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(5));

        when(userRepository.findByEmailIgnoreCase("student@gmail.com")).thenReturn(Optional.of(user));
        when(resetTokenRepository.findTopByUserUserIdAndUsedFalseOrderByCreatedAtDesc(3)).thenReturn(Optional.of(token));

        ApiException exception = Assertions.assertThrows(
                ApiException.class,
                () -> passwordService.resetPassword("student@gmail.com", "654321", "Seal@2027")
        );

        Assertions.assertEquals("Invalid email or OTP", exception.getMessage());
        verify(userRepository, never()).save(any());
        verify(resetTokenRepository, never()).save(any());
    }

    @Test
    void verifyResetOtp_shouldAcceptMatchingOtp() {
        UserEntity user = new UserEntity();
        user.setUserId(4);
        user.setEmail("student@gmail.com");

        PasswordResetTokenEntity token = new PasswordResetTokenEntity();
        token.setUser(user);
        token.setToken("8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92");
        token.setUsed(false);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(5));

        when(userRepository.findByEmailIgnoreCase("student@gmail.com")).thenReturn(Optional.of(user));
        when(resetTokenRepository.findTopByUserUserIdAndUsedFalseOrderByCreatedAtDesc(4)).thenReturn(Optional.of(token));

        Assertions.assertDoesNotThrow(() -> passwordService.verifyResetOtp("student@gmail.com", "123456"));
        verify(userRepository, never()).save(any());
        verify(resetTokenRepository, never()).save(any());
    }
}
