package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.CreateUserRequest;
import com.mangaproject.backend.service.GmailEmailService;
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

        if ("admin".equals(request.getRole())) {
            throw new RuntimeException("Không thể tạo tài khoản Admin qua endpoint này");
        }

        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new RuntimeException("Role không hợp lệ: " + request.getRole()));

        // Dùng password Admin nhập thay vì random
        String tempPassword = request.getTempPassword();

        String username = request.getEmail().split("@")[0] + "_" + System.currentTimeMillis() % 10000;

        User user = new User();
        user.setUsername(username);
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setName(request.getName());
        user.setRole(role);
        user.setIsActive(true);
        if (request.getPersonalEmail() != null && !request.getPersonalEmail().isBlank()) {
            user.setPersonalEmail(request.getPersonalEmail());
        }

        user = userRepository.save(user);

        // Gửi email đến personalEmail nếu có, nếu không thì gửi đến email công ty
        String emailTarget = (request.getPersonalEmail() != null && !request.getPersonalEmail().isBlank())
                ? request.getPersonalEmail()
                : request.getEmail();

        try {
            if (emailService instanceof GmailEmailService gmailService) {
                gmailService.sendAccountCreatedEmail(
                        emailTarget,           // nơi nhận
                        request.getEmail(),    // email công ty hiển thị trong nội dung
                        request.getName(),
                        request.getRole(),
                        tempPassword
                );
            } else {
                emailService.sendAccountCreatedEmail(
                        emailTarget,
                        request.getName(),
                        request.getRole(),
                        tempPassword
                );
            }
        } catch (Exception e) {
            log.error("Failed to send account creation email to {}: {}", emailTarget, e.getMessage());
        }

        log.info("Admin created user: email={}, role={}", request.getEmail(), request.getRole());
        return mapToDTOWithPassword(user, tempPassword);
    }

    public UserDTO updateUser(String id, CreateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getName() != null) user.setName(request.getName());
        if (request.getEmail() != null) user.setEmail(request.getEmail());
        if (request.getRole() != null) {
            Role role = roleRepository.findByName(request.getRole())
                    .orElseThrow(() -> new RuntimeException("Role không hợp lệ"));
            user.setRole(role);
        }

        user = userRepository.save(user);
        return mapToDTO(user);
    }

    public void deleteUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if ("admin".equals(user.getRoleName())) {
            throw new RuntimeException("Không thể xóa tài khoản Admin");
        }
        userRepository.delete(user);
        log.info("Admin deleted user: id={}, email={}", id, user.getEmail());
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

        String resetTarget = (user.getPersonalEmail() != null && !user.getPersonalEmail().isBlank())
                ? user.getPersonalEmail()
                : user.getEmail();
        try {
            emailService.sendPasswordResetByAdminEmail(
                    resetTarget,
                    user.getName(),
                    tempPassword
            );
        } catch (Exception e) {
            log.error("Failed to send reset email to {}: {}", resetTarget, e.getMessage());
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
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setName(user.getName());
        dto.setRole(user.getRoleName());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setCreatedAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        dto.setIsActive(user.getIsActive());
        dto.setTempPassword(null);
        dto.setPersonalEmail(user.getPersonalEmail());
        return dto;
    }

    private UserDTO mapToDTOWithPassword(User user, String tempPassword) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setName(user.getName());
        dto.setRole(user.getRoleName());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setCreatedAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        dto.setIsActive(user.getIsActive());
        dto.setTempPassword(tempPassword);
        dto.setPersonalEmail(user.getPersonalEmail());
        return dto;
    }
}