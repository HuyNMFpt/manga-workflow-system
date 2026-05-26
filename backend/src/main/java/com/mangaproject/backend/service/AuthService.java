package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.PasswordResetToken;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.PasswordResetTokenRepository;
import com.mangaproject.backend.repository.UserRepository;
import com.mangaproject.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final EmailService emailService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.password-reset.token-expiry-hours:1}")
    private int tokenExpiryHours;

    @Value("${app.password-reset.max-requests-per-hour:3}")
    private int maxRequestsPerHour;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtUtil.generateToken(user.getEmail(), user.getRole().name());

        UserDTO userDTO = mapToDTO(user);
        return new LoginResponse(userDTO, token, refreshToken);
    }

    public LoginResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setName(request.getName());
        user.setRole(User.UserRole.valueOf(request.getRole()));

        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtUtil.generateToken(user.getEmail(), user.getRole().name());

        UserDTO userDTO = mapToDTO(user);
        return new LoginResponse(userDTO, token, refreshToken);
    }

    public UserDTO getMe(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToDTO(user);
    }

    /**
     * Initiate password reset process
     * Generates token and sends reset email
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail();
        log.info("Password reset requested for email: {}", email);

        // Find user by email (return success even if not found for security)
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            log.warn("Password reset requested for non-existent email: {}", email);
            // Return success to prevent email enumeration attacks
            return;
        }

        // Rate limiting: Check recent requests
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long recentRequests = resetTokenRepository.countRecentRequestsByUser(user, oneHourAgo);

        if (recentRequests >= maxRequestsPerHour) {
            log.warn("Too many password reset requests for user: {}", email);
            throw new RuntimeException("Too many password reset requests. Please try again later.");
        }

        // Invalidate any existing tokens for this user
        resetTokenRepository.deleteByUser(user);

        // Generate new reset token
        String token = UUID.randomUUID().toString();
        LocalDateTime expiryDate = LocalDateTime.now().plusHours(tokenExpiryHours);

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setToken(token);
        resetToken.setUser(user);
        resetToken.setExpiryDate(expiryDate);
        resetToken.setUsed(false);

        resetTokenRepository.save(resetToken);

        // Build reset URL
        String resetUrl = String.format("%s/reset-password?token=%s", frontendUrl, token);

        // Send reset email
        try {
            emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), token, resetUrl);
            log.info("Password reset email sent successfully to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", email, e);
            throw new RuntimeException("Failed to send password reset email. Please try again later.");
        }
    }

    /**
     * Validate reset token
     */
    @Transactional(readOnly = true)
    public ValidateTokenResponse validateResetToken(String token) {
        log.info("Validating reset token");

        PasswordResetToken resetToken = resetTokenRepository.findByToken(token)
                .orElse(null);

        if (resetToken == null) {
            log.warn("Invalid reset token: {}", token);
            return ValidateTokenResponse.invalid("Invalid reset link. Please request a new password reset.");
        }

        if (resetToken.isUsed()) {
            log.warn("Reset token already used: {}", token);
            return ValidateTokenResponse.invalid("This reset link has already been used. Please request a new one.");
        }

        if (resetToken.isExpired()) {
            log.warn("Reset token expired: {}", token);
            return ValidateTokenResponse.invalid("Reset link has expired. Please request a new password reset.");
        }

        log.info("Reset token is valid for user: {}", resetToken.getUser().getEmail());
        return ValidateTokenResponse.valid(resetToken.getUser().getEmail());
    }

    /**
     * Reset password using valid token
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String token = request.getToken();
        String newPassword = request.getNewPassword();

        log.info("Processing password reset");

        // Find and validate token
        PasswordResetToken resetToken = resetTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid reset link"));

        if (resetToken.isUsed()) {
            throw new RuntimeException("This reset link has already been used");
        }

        if (resetToken.isExpired()) {
            throw new RuntimeException("Reset link has expired. Please request a new one.");
        }

        // Update user password
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark token as used
        resetToken.setUsed(true);
        resetTokenRepository.save(resetToken);

        // Delete all other tokens for this user
        resetTokenRepository.deleteByUser(user);

        log.info("Password reset successfully for user: {}", user.getEmail());
    }

    /**
     * Cleanup expired and used tokens (scheduled job)
     */
    @Transactional
    public void cleanupExpiredTokens() {
        log.info("Cleaning up expired and used password reset tokens");
        resetTokenRepository.deleteExpiredAndUsedTokens(LocalDateTime.now());
    }

    private UserDTO mapToDTO(User user) {
        return new UserDTO(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole().name(),
                user.getAvatarUrl(),
                user.getCreatedAt().toString()
        );
    }
}