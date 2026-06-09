package com.mangaproject.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class GmailEmailService implements EmailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name:Manga CW&PM}")
    private String appName;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void sendPasswordResetEmail(String toEmail, String userName, String resetToken, String resetUrl) throws Exception {
        log.info("Sending password reset email to: {}", toEmail);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            // Email metadata
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Reset Your Password - " + appName);

            // Build HTML content using Thymeleaf template
            Context context = new Context();
            context.setVariable("userName", userName);
            context.setVariable("resetUrl", resetUrl);
            context.setVariable("appName", appName);
            context.setVariable("expiryHours", 1);

            String htmlContent = templateEngine.process("reset-password-email", context);
            helper.setText(htmlContent, true);

            // Send email
            mailSender.send(message);
            log.info("Password reset email sent successfully to: {}", toEmail);

        } catch (MessagingException e) {
            log.error("Failed to send password reset email to: {}", toEmail, e);
            throw new Exception("Failed to send password reset email", e);
        }
    }

    @Override
    public void sendWelcomeEmail(String toEmail, String userName) throws Exception {
        log.info("Sending welcome email to: {}", toEmail);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Welcome to " + appName + "!");

            // Simple welcome message (can be templated later)
            String htmlContent = String.format("""
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #6366f1;">Welcome to %s!</h2>
                        <p>Hi %s,</p>
                        <p>Thank you for joining our manga collaboration platform!</p>
                        <p>Start creating amazing manga projects with your team today.</p>
                        <p>Best regards,<br>The %s Team</p>
                    </div>
                </body>
                </html>
                """, appName, userName, appName);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Welcome email sent successfully to: {}", toEmail);

        } catch (MessagingException e) {
            log.error("Failed to send welcome email to: {}", toEmail, e);
            throw new Exception("Failed to send welcome email", e);
        }
    }

    @Override
    public void sendAccountCreatedEmail(String toEmail, String name, String role, String tempPassword) throws Exception {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("[Manga CW&PM] Tài khoản của bạn đã được tạo");

            String roleDisplay = switch (role) {
                case "mangaka" -> "Mangaka (Tác giả)";
                case "assistant" -> "Trợ lý";
                case "editor" -> "Tantou Editor";
                case "board_member" -> "Thành viên Hội đồng";
                default -> role;
            };

            String htmlContent = """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Chào mừng đến với Manga CW&PM!</h2>
                    <p>Xin chào <strong>%s</strong>,</p>
                    <p>Tài khoản của bạn đã được tạo với vai trò <strong>%s</strong>.</p>
                    <p>Thông tin đăng nhập:</p>
                    <ul>
                        <li><strong>Email:</strong> %s</li>
                        <li><strong>Mật khẩu tạm:</strong> <code>%s</code></li>
                    </ul>
                    <p style="color: red;"><strong>Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu!</strong></p>
                    <p>Truy cập: <a href="http://localhost:5173">http://localhost:5173</a></p>
                </div>
                """.formatted(name, roleDisplay, toEmail, tempPassword);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Account created email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send account created email to: {}", toEmail, e);
            throw new Exception("Failed to send account created email", e);
        }
    }

    @Override
    public void sendPasswordResetByAdminEmail(String toEmail, String name, String tempPassword) throws Exception {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("[Manga CW&PM] Mật khẩu của bạn đã được reset");

            String htmlContent = """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Mật khẩu đã được reset</h2>
                    <p>Xin chào <strong>%s</strong>,</p>
                    <p>Admin đã reset mật khẩu tài khoản của bạn.</p>
                    <p><strong>Mật khẩu tạm mới:</strong> <code>%s</code></p>
                    <p style="color: red;"><strong>Vui lòng đổi mật khẩu ngay sau khi đăng nhập!</strong></p>
                </div>
                """.formatted(name, tempPassword);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Password reset by admin email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", toEmail, e);
            throw new Exception("Failed to send password reset email", e);
        }
    }
}