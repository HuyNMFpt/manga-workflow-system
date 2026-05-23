package com.mangaproject.backend.service;

/**
 * Email service interface for sending emails
 */
public interface EmailService {

    /**
     * Send password reset email with token
     *
     * @param toEmail Recipient email address
     * @param userName Recipient name
     * @param resetToken Password reset token
     * @param resetUrl Full reset URL (e.g., http://localhost:5173/reset-password?token=xxx)
     * @throws Exception if email sending fails
     */
    void sendPasswordResetEmail(String toEmail, String userName, String resetToken, String resetUrl) throws Exception;

    /**
     * Send welcome email after registration (optional - for future)
     *
     * @param toEmail Recipient email address
     * @param userName Recipient name
     * @throws Exception if email sending fails
     */
    void sendWelcomeEmail(String toEmail, String userName) throws Exception;
}