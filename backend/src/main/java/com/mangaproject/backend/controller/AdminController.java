package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.UserRepository;
import com.mangaproject.backend.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final UserRepository userRepository;

    // GET /api/admin/users — Xem tất cả users
    @GetMapping("/users")
    public ApiResponse<List<UserDTO>> getAllUsers(Authentication authentication) {
        checkAdmin(authentication);
        return ApiResponse.success(adminService.getAllUsers());
    }

    // POST /api/admin/users — Admin tạo account mới
    @PostMapping("/users")
    public ApiResponse<UserDTO> createUser(
            @Valid @RequestBody CreateUserRequest request,
            Authentication authentication) {
        checkAdmin(authentication);
        return ApiResponse.success(
                adminService.createUser(request),
                "Tạo tài khoản thành công! Email đăng nhập đã được gửi."
        );
    }

    // PUT /api/admin/users/{id} — Cập nhật thông tin user
    @PutMapping("/users/{id}")
    public ApiResponse<UserDTO> updateUser(
            @PathVariable String id,
            @RequestBody CreateUserRequest request,
            Authentication authentication) {
        checkAdmin(authentication);
        return ApiResponse.success(adminService.updateUser(id, request));
    }

    // PUT /api/admin/users/{id}/toggle-active — Kích hoạt/vô hiệu hóa account
    @DeleteMapping("/users/{id}")
    public ApiResponse<Void> deleteUser(
            @PathVariable String id,
            Authentication authentication) {
        checkAdmin(authentication);
        adminService.deleteUser(id);
        return ApiResponse.success(null, "Đã xóa tài khoản");
    }

    @PutMapping("/users/{id}/toggle-active")
    public ApiResponse<UserDTO> toggleActive(
            @PathVariable String id,
            Authentication authentication) {
        checkAdmin(authentication);
        return ApiResponse.success(adminService.toggleActive(id));
    }

    // PUT /api/admin/users/{id}/skills — Admin sửa kỹ năng của Assistant
    @PutMapping("/users/{id}/skills")
    public ApiResponse<Void> updateUserSkills(
            @PathVariable String id,
            @RequestBody java.util.Map<String, java.util.List<String>> body,
            Authentication authentication) {
        checkAdmin(authentication);
        com.mangaproject.backend.model.User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        java.util.List<String> skills = body.containsKey("taskTypes")
                ? body.get("taskTypes") : body.get("skills");
        if (skills != null) {
            user.setSkills("[" + skills.stream()
                    .map(s -> "\"" + s + "\"")
                    .collect(java.util.stream.Collectors.joining(",")) + "]");
            userRepository.save(user);
        }
        return ApiResponse.success(null, "Kỹ năng đã được cập nhật");
    }

    // PUT /api/admin/users/{id}/set-board-chair — Đặt Board trưởng
    @PutMapping("/users/{id}/set-board-chair")
    public ApiResponse<Void> setBoardChair(
            @PathVariable String id,
            Authentication authentication) {
        checkAdmin(authentication);
        adminService.setBoardChair(id);
        return ApiResponse.success(null, "Board trưởng đã được cập nhật");
    }

    // POST /api/admin/users/{id}/reset-password — Admin reset mật khẩu tạm cho user
    @PostMapping("/users/{id}/reset-password")
    public ApiResponse<Void> resetPassword(
            @PathVariable String id,
            Authentication authentication) {
        checkAdmin(authentication);
        adminService.resetPasswordAndSendEmail(id);
        return ApiResponse.success(null, "Mật khẩu tạm đã được gửi qua email.");
    }

    private void checkAdmin(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!"admin".equals(user.getRoleName())) {
            throw new RuntimeException("Chỉ Admin mới có quyền thực hiện thao tác này");
        }
    }
}