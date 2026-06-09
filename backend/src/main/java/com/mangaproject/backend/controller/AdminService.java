package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.CreateUserRequest;
import com.mangaproject.backend.dto.UserDTO;
import com.mangaproject.backend.model.Role;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.RoleRepository;
import com.mangaproject.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public UserDTO createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại trong hệ thống");
        }

        // Không cho tạo account admin qua endpoint này
        if ("admin".equals(request.getRole())) {
            throw new RuntimeException("Không thể tạo tài khoản Admin qua endpoint này");
        }

        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new RuntimeException("Role không hợp lệ: " + request.getRole()));

        // Generate mật khẩu tạm ngẫu nhiên
        String tempPassword = generateTempPassword();

        String username = request.getEmail().split("@")[0] + "_" + System.currentTimeMillis() % 10000;

        User user = new User();
        user.setUsername(username);
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setName(request.getName());
        user.setRoleId(role.getId());
        user.setIsActive(true);

        user = userRepository.save(user);

        // Gửi email thông tin đăng nhập
        try {
            emailService.sendAccountCreatedEmail(
                    request.getEmail(),
                    request.getName(),
                    request.getRole(),
                    tempPassword
            );
        } catch (Exception e) {
            log.error("Failed to send account creation email to {}: {}", request.getEmail(), e.getMessage());
        }

        log.info("Admin created user: email={}, role={}", request.getEmail(), request.getRole());
        return mapToDTO(user);
    }

    public UserDTO updateUser(String id, CreateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getName() != null) user.setName(request.getName());
        if (request.getRole() != null) {
            Role role = roleRepository.findByName(request.getRole())
                    .orElseThrow(() -> new RuntimeException("Role không hợp lệ"));
            user.setRoleId(role.getId());
        }

        user = userRepository.save(user);
        return mapToDTO(user);
    }

    public UserDTO toggleActive(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsActive(!user.getIsActive());
        user = userRepository.save(user);
        return mapToDTO(user);
    }

    public void resetPasswordAndSendEmail(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String tempPassword = generateTempPassword();
        user.setPassword(passwordEncoder.encode(tempPassword));
        userRepository.save(user);

        try {
            emailService.sendPasswordResetByAdminEmail(
                    user.getEmail(),
                    user.getName(),
                    tempPassword
            );
        } catch (Exception e) {
            log.error("Failed to send reset email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    private String generateTempPassword() {
        // Tạo mật khẩu tạm 8 ký tự: chữ hoa + số
        String chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 8; i++) {
            sb.append(chars.charAt((int)(Math.random() * chars.length())));
        }
        return sb.toString();
    }

    private UserDTO mapToDTO(User user) {
        return new UserDTO(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRoleName(),
                user.getAvatarUrl(),
                user.getCreatedAt() != null ? user.getCreatedAt().toString() : null
        );
    }
}
