package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.UserRepository;
import com.mangaproject.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "APIs for user authentication and password management")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Authenticate user and get JWT token")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    @PostMapping("/register")
    @Operation(summary = "Register", description = "Disabled - Only admin can create accounts")
    public ApiResponse<Void> register() {
        throw new RuntimeException("Đăng ký trực tiếp không được phép. Vui lòng liên hệ Admin để được cấp tài khoản.");
    }

    @PutMapping("/change-password")
    @Operation(summary = "Change Password", description = "User changes their password after first login")
    public ApiResponse<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        authService.changePassword(authentication.getName(), request);
        return ApiResponse.success(null, "Đổi mật khẩu thành công!");
    }

    @GetMapping("/me")
    @Operation(summary = "Get Current User", description = "Get authenticated user information")
    public ApiResponse<UserDTO> getMe(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Not authenticated");
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserDTO userDTO = new UserDTO(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRoleName(),
                user.getAvatarUrl(),
                user.getCreatedAt().toString()
        );

        return ApiResponse.success(userDTO);
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout", description = "Logout current user")
    public ApiResponse<Void> logout() {
        return ApiResponse.success(null);
    }

    // ============================================
    // PASSWORD RESET ENDPOINTS
    // ============================================

    @PostMapping("/forgot-password")
    @Operation(
            summary = "Forgot Password",
            description = "Request password reset email. Returns success even if email doesn't exist (security)."
    )
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            authService.forgotPassword(request);
            return ResponseEntity.ok(
                    ApiResponse.success(
                            null,
                            "If the email exists, a password reset link has been sent. Please check your inbox."
                    )
            );
        } catch (RuntimeException e) {
            log.error("Forgot password error: {}", e.getMessage());

            // Rate limiting error - return 429
            if (e.getMessage().contains("Too many")) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(ApiResponse.error(e.getMessage()));
            }

            // Other errors - return 500
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to process password reset request. Please try again later."));
        }
    }

    @GetMapping("/validate-reset-token")
    @Operation(
            summary = "Validate Reset Token",
            description = "Check if password reset token is valid, not expired, and not used"
    )
    public ResponseEntity<ApiResponse<ValidateTokenResponse>> validateResetToken(
            @RequestParam String token) {

        try {
            ValidateTokenResponse response = authService.validateResetToken(token);

            if (response.isValid()) {
                return ResponseEntity.ok(ApiResponse.success(response));
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error(response.getMessage(), response));
            }

        } catch (Exception e) {
            log.error("Token validation error: {}", e.getMessage());
            ValidateTokenResponse errorResponse = ValidateTokenResponse.invalid(
                    "Failed to validate token. Please try again."
            );
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(errorResponse.getMessage(), errorResponse));
        }
    }

    @PostMapping("/reset-password")
    @Operation(
            summary = "Reset Password",
            description = "Reset password using valid token from email"
    )
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request);
            return ResponseEntity.ok(
                    ApiResponse.success(null, "Password reset successfully. You can now login with your new password.")
            );

        } catch (RuntimeException e) {
            log.error("Password reset error: {}", e.getMessage());

            // Token-related errors - return 400
            if (e.getMessage().contains("Invalid") ||
                    e.getMessage().contains("expired") ||
                    e.getMessage().contains("used")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error(e.getMessage()));
            }

            // Other errors - return 500
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to reset password. Please try again."));
        }
    }
}