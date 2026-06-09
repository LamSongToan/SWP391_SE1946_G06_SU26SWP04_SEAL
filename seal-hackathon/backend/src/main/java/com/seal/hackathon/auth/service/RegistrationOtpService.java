package com.seal.hackathon.auth.service;

import com.seal.hackathon.auth.dto.RegistrationOtpResponse;
import com.seal.hackathon.auth.entity.RegistrationOtpEntity;
import com.seal.hackathon.auth.repository.RegistrationOtpRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class RegistrationOtpService {

    private final RegistrationOtpRepository registrationOtpRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.auth.password-reset.otp-expiry-minutes:10}")
    private long otpExpiryMinutes;

    @Value("${app.mail.from:}")
    private String mailFrom;

    @Value("${spring.mail.host:}")
    private String mailHost;

    public RegistrationOtpService(RegistrationOtpRepository registrationOtpRepository,
                                  UserRepository userRepository,
                                  JavaMailSender mailSender) {
        this.registrationOtpRepository = registrationOtpRepository;
        this.userRepository = userRepository;
        this.mailSender = mailSender;
    }

    @Transactional
    public RegistrationOtpResponse sendOtp(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }

        ensureMailIsConfigured();
        registrationOtpRepository.invalidateAllForEmail(normalizedEmail);

        String otp = generateOtp();
        RegistrationOtpEntity entity = new RegistrationOtpEntity();
        entity.setEmail(normalizedEmail);
        entity.setToken(hashOtp(otp));
        entity.setExpiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes));
        registrationOtpRepository.save(entity);

        sendRegistrationOtpEmail(normalizedEmail, otp);
        return new RegistrationOtpResponse(
                "A registration verification code has been sent to your email.",
                otpExpiryMinutes
        );
    }

    @Transactional(readOnly = true)
    public RegistrationOtpEntity requireValidOtp(String email, String otp) {
        String normalizedEmail = normalizeEmail(email);
        RegistrationOtpEntity tokenEntity = registrationOtpRepository
                .findTopByEmailIgnoreCaseAndUsedFalseOrderByCreatedAtDesc(normalizedEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Email verification code is invalid or expired"));

        if (Boolean.TRUE.equals(tokenEntity.getUsed())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email verification code has already been used");
        }
        if (tokenEntity.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email verification code has expired");
        }
        if (!tokenEntity.getToken().equals(hashOtp(otp))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email verification code is invalid or expired");
        }
        return tokenEntity;
    }

    @Transactional
    public void markUsed(RegistrationOtpEntity tokenEntity) {
        tokenEntity.setUsed(true);
        registrationOtpRepository.save(tokenEntity);
    }

    private void sendRegistrationOtpEmail(String email, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            if (!mailFrom.isBlank()) {
                helper.setFrom(mailFrom);
            }
            helper.setTo(email);
            helper.setSubject("SEAL Hackathon account registration verification code");
            helper.setText(buildOtpEmailBody(email, otp), true);
            mailSender.send(message);
        } catch (MailException | MessagingException ex) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Unable to send registration verification email right now");
        }
    }

    private String buildOtpEmailBody(String email, String otp) {
        return """
                <div style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#1d2638;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dfe6ef;border-radius:16px;overflow:hidden;">
                    <div style="padding:24px 32px;background:linear-gradient(135deg,#1677ff 0%%,#13c2c2 100%%);color:#ffffff;">
                      <div style="font-size:28px;font-weight:800;letter-spacing:0.5px;">SEAL</div>
                      <div style="margin-top:8px;font-size:15px;opacity:0.92;">Software Engineering Agile League</div>
                    </div>
                    <div style="padding:32px;">
                      <p style="margin:0 0 12px;font-size:15px;">Hello,</p>
                      <p style="margin:0 0 18px;font-size:15px;line-height:1.65;">
                        Use the verification code below to complete your SEAL Hackathon account registration for <strong>%s</strong>.
                      </p>
                      <div style="margin:0 0 18px;padding:18px;border-radius:14px;background:#f8fbff;border:1px solid #cfe2ff;text-align:center;">
                        <div style="font-size:13px;font-weight:700;color:#0958d9;letter-spacing:1.2px;text-transform:uppercase;">Verification Code</div>
                        <div style="margin-top:10px;font-size:34px;font-weight:800;letter-spacing:10px;color:#1d2638;">%s</div>
                      </div>
                      <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#4f5d75;">
                        This code will expire in %d minutes. It can only be used once.
                      </p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#4f5d75;">
                        If you did not request this registration, you can safely ignore this email.
                      </p>
                    </div>
                    <div style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e5edf5;font-size:12px;color:#637381;">
                      SEAL Hackathon Management System
                    </div>
                  </div>
                </div>
                """.formatted(email, otp, otpExpiryMinutes);
    }

    private void ensureMailIsConfigured() {
        if (mailHost == null || mailHost.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Email delivery is not configured. Set MAIL_HOST, MAIL_USERNAME, and MAIL_APP_PASSWORD first.");
        }
    }

    private String generateOtp() {
        int number = secureRandom.nextInt(1_000_000);
        return "%06d".formatted(number);
    }

    private String hashOtp(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(otp.trim().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
