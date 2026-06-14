package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.PasswordResetToken;
import com.mangaproject.backend.model.Role;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.PasswordResetTokenRepository;
import com.mangaproject.backend.repository.RoleRepository;
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
    private final RoleRepository roleRepository;

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

        // Update last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRoleName());
        String refreshToken = jwtUtil.generateToken(user.getEmail(), user.getRoleName());

        UserDTO userDTO = mapToDTO(user);
        return new LoginResponse(userDTO, token, refreshToken);
    }

    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không đúng");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Password changed for user: {}", email);
    }

    public LoginResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        // Generate username from email if not provided
        String username = request.getEmail().split("@")[0] + "_" + System.currentTimeMillis() % 10000;

        User user = new User();
        user.setUsername(username);
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setName(request.getName());

        // Lấy roleId từ bảng roles
        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new RuntimeException("Invalid role: " + request.getRole()));
        user.setRoleId(role.getId());
        user.setIsActive(true);

        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRoleName());
        String refreshToken = jwtUtil.generateToken(user.getEmail(), user.getRoleName());

        UserDTO userDTO = mapToDTO(user);
        return new LoginResponse(userDTO, token, refreshToken);
    }

    public UserDTO getMe(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToDTO(user);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail();
        log.info("Password reset requested for email: {}", email);

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            log.warn("Password reset requested for non-existent email: {}", email);
            return;
        }

        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long recentRequests = resetTokenRepository.countRecentRequestsByUser(user, oneHourAgo);

        if (recentRequests >= maxRequestsPerHour) {
            log.warn("Too many password reset requests for user: {}", email);
            throw new RuntimeException("Too many password reset requests. Please try again later.");
        }

        resetTokenRepository.deleteByUser(user);

        String token = UUID.randomUUID().toString();
        LocalDateTime expiryDate = LocalDateTime.now().plusHours(tokenExpiryHours);

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setToken(token);
        resetToken.setUser(user);
        resetToken.setExpiryDate(expiryDate);
        resetToken.setUsed(false);

        resetTokenRepository.save(resetToken);

        String resetUrl = String.format("%s/reset-password?token=%s", frontendUrl, token);

        try {
            emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), token, resetUrl);
            log.info("Password reset email sent successfully to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", email, e);
            throw new RuntimeException("Failed to send password reset email. Please try again later.");
        }
    }

    @Transactional(readOnly = true)
    public ValidateTokenResponse validateResetToken(String token) {
        log.info("Validating reset token");

        PasswordResetToken resetToken = resetTokenRepository.findByToken(token).orElse(null);

        if (resetToken == null) {
            return ValidateTokenResponse.invalid("Invalid reset link. Please request a new password reset.");
        }

        if (resetToken.isUsed()) {
            return ValidateTokenResponse.invalid("This reset link has already been used. Please request a new one.");
        }

        if (resetToken.isExpired()) {
            return ValidateTokenResponse.invalid("Reset link has expired. Please request a new password reset.");
        }

        return ValidateTokenResponse.valid(resetToken.getUser().getEmail());
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String token = request.getToken();
        String newPassword = request.getNewPassword();

        PasswordResetToken resetToken = resetTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid reset link"));

        if (resetToken.isUsed()) {
            throw new RuntimeException("This reset link has already been used");
        }

        if (resetToken.isExpired()) {
            throw new RuntimeException("Reset link has expired. Please request a new one.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        resetTokenRepository.save(resetToken);

        resetTokenRepository.deleteByUser(user);

        log.info("Password reset successfully for user: {}", user.getEmail());
    }

    @Transactional
    public void cleanupExpiredTokens() {
        log.info("Cleaning up expired and used password reset tokens");
        resetTokenRepository.deleteExpiredAndUsedTokens(LocalDateTime.now());
    }

    private UserDTO mapToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setName(user.getName());
        dto.setRole(user.getRoleName());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setCreatedAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        dto.setIsActive(user.getIsActive());
        return dto;
    }
}