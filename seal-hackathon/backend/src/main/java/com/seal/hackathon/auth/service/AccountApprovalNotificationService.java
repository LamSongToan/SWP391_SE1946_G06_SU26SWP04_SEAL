package com.seal.hackathon.auth.service;

import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.common.ApiException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class AccountApprovalNotificationService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:}")
    private String mailFrom;

    @Value("${spring.mail.host:}")
    private String mailHost;

    public AccountApprovalNotificationService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendApprovedEmail(UserEntity user) {
        ensureMailIsConfigured();

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            if (!mailFrom.isBlank()) {
                helper.setFrom(mailFrom);
            }
            helper.setTo(user.getEmail());
            helper.setSubject("SEAL Hackathon account approved");
            helper.setText(buildApprovedEmailBody(user), true);
            mailSender.send(message);
        } catch (MailException | MessagingException ex) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Unable to send account approval email right now");
        }
    }

    public void sendRejectedEmail(UserEntity user, String rejectionReason) {
        ensureMailIsConfigured();

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            if (!mailFrom.isBlank()) {
                helper.setFrom(mailFrom);
            }
            helper.setTo(user.getEmail());
            helper.setSubject("SEAL Hackathon account registration needs updates");
            helper.setText(buildRejectedEmailBody(user, rejectionReason), true);
            mailSender.send(message);
        } catch (MailException | MessagingException ex) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Unable to send account rejection email right now");
        }
    }

    private String buildApprovedEmailBody(UserEntity user) {
        String recipientName = user.getFullName() == null || user.getFullName().isBlank()
                ? user.getUsername()
                : user.getFullName().trim();

        return """
                <div style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#1d2638;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dfe6ef;border-radius:16px;overflow:hidden;">
                    <div style="padding:24px 32px;background:linear-gradient(135deg,#1677ff 0%%,#13c2c2 100%%);color:#ffffff;">
                      <div style="font-size:28px;font-weight:800;letter-spacing:0.5px;">SEAL</div>
                      <div style="margin-top:8px;font-size:15px;opacity:0.92;">Software Engineering Agile League</div>
                    </div>
                    <div style="padding:32px;">
                      <p style="margin:0 0 12px;font-size:15px;">Hello %s,</p>
                      <p style="margin:0 0 18px;font-size:15px;line-height:1.65;">
                        Your SEAL Hackathon account has been approved successfully.
                        You can now sign in with the email address you registered and start using the system.
                      </p>
                      <div style="margin:0 0 18px;padding:18px;border-radius:14px;background:#f8fbff;border:1px solid #cfe2ff;text-align:center;">
                        <div style="font-size:13px;font-weight:700;color:#0958d9;letter-spacing:1.2px;text-transform:uppercase;">Account Status</div>
                        <div style="margin-top:10px;font-size:28px;font-weight:800;letter-spacing:1px;color:#1d2638;">Approved</div>
                      </div>
                      <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#4f5d75;">
                        You can now return to SEAL Hackathon and sign in using your registered email and password.
                      </p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#4f5d75;">
                        If you did not request this account, please contact the Event Coordinator.
                      </p>
                    </div>
                    <div style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e5edf5;font-size:12px;color:#637381;">
                      SEAL Hackathon Management System
                    </div>
                  </div>
                </div>
                """.formatted(recipientName);
    }

    private String buildRejectedEmailBody(UserEntity user, String rejectionReason) {
        String recipientName = user.getFullName() == null || user.getFullName().isBlank()
                ? user.getUsername()
                : user.getFullName().trim();
        String safeReason = rejectionReason == null || rejectionReason.isBlank()
                ? "No rejection reason was recorded."
                : rejectionReason.trim();

        return """
                <div style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#1d2638;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dfe6ef;border-radius:16px;overflow:hidden;">
                    <div style="padding:24px 32px;background:linear-gradient(135deg,#1677ff 0%%,#13c2c2 100%%);color:#ffffff;">
                      <div style="font-size:28px;font-weight:800;letter-spacing:0.5px;">SEAL</div>
                      <div style="margin-top:8px;font-size:15px;opacity:0.92;">Software Engineering Agile League</div>
                    </div>
                    <div style="padding:32px;">
                      <p style="margin:0 0 12px;font-size:15px;">Hello %s,</p>
                      <p style="margin:0 0 18px;font-size:15px;line-height:1.65;">
                        Your SEAL Hackathon registration was reviewed, but it cannot be approved yet.
                        Please update your registration details and submit the request again.
                      </p>
                      <div style="margin:0 0 18px;padding:18px;border-radius:14px;background:#fff7f7;border:1px solid #ffd1d1;">
                        <div style="font-size:13px;font-weight:700;color:#cf1322;letter-spacing:1.2px;text-transform:uppercase;">Rejection Reason</div>
                        <div style="margin-top:10px;font-size:16px;line-height:1.7;color:#1d2638;white-space:pre-wrap;">%s</div>
                      </div>
                      <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#4f5d75;">
                        Go to the SEAL Hackathon sign-in page, enter your registered email and password, then choose the update flow to revise your information and resubmit the request.
                      </p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#4f5d75;">
                        After resubmission, your account will return to pending approval for coordinator review.
                      </p>
                    </div>
                    <div style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e5edf5;font-size:12px;color:#637381;">
                      SEAL Hackathon Management System
                    </div>
                  </div>
                </div>
                """.formatted(recipientName, safeReason);
    }

    private void ensureMailIsConfigured() {
        if (mailHost == null || mailHost.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Email delivery is not configured. Set MAIL_HOST, MAIL_USERNAME, and MAIL_APP_PASSWORD first.");
        }
    }
}
