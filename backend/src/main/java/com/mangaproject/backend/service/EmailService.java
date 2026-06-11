package com.mangaproject.backend.service;

/**
 * Email service interface for sending emails
 */
public interface EmailService {

    /**
     * Send password reset email with token
     */
    void sendPasswordResetEmail(String toEmail, String userName, String resetToken, String resetUrl) throws Exception;

    /**
     * Send welcome email after registration
     */
    void sendWelcomeEmail(String toEmail, String userName) throws Exception;

    /**
     * Admin tạo account mới — gửi thông tin đăng nhập tạm
     */
    void sendAccountCreatedEmail(String toEmail, String name, String role, String tempPassword) throws Exception;

    /**
     * Admin reset password — gửi mật khẩu tạm mới
     */
    void sendPasswordResetByAdminEmail(String toEmail, String name, String tempPassword) throws Exception;
}