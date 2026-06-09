package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.ApiResponse;
import com.mangaproject.backend.dto.NotificationDTO;
import com.mangaproject.backend.model.Notification;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.NotificationRepository;
import com.mangaproject.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    // GET /api/notifications — lấy tất cả notification của user hiện tại
    @GetMapping
    public ApiResponse<List<NotificationDTO>> getMyNotifications(Authentication authentication) {
        User user = getUser(authentication);
        List<NotificationDTO> notifications = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ApiResponse.success(notifications);
    }

    // GET /api/notifications/unread-count — đếm số chưa đọc
    @GetMapping("/unread-count")
    public ApiResponse<Long> getUnreadCount(Authentication authentication) {
        User user = getUser(authentication);
        long count = notificationRepository.countByUserIdAndIsRead(user.getId(), false);
        return ApiResponse.success(count);
    }

    // PUT /api/notifications/{id}/read — đánh dấu đã đọc
    @PutMapping("/{id}/read")
    public ApiResponse<Void> markRead(@PathVariable String id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setIsRead(true);
            n.setReadAt(LocalDateTime.now());
            notificationRepository.save(n);
        });
        return ApiResponse.success(null);
    }

    // PUT /api/notifications/read-all — đánh dấu tất cả đã đọc
    @PutMapping("/read-all")
    public ApiResponse<Void> markAllRead(Authentication authentication) {
        User user = getUser(authentication);
        List<Notification> unread = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .filter(n -> !n.getIsRead())
                .collect(Collectors.toList());
        unread.forEach(n -> {
            n.setIsRead(true);
            n.setReadAt(LocalDateTime.now());
        });
        notificationRepository.saveAll(unread);
        return ApiResponse.success(null);
    }

    private User getUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private NotificationDTO toDTO(Notification n) {
        return new NotificationDTO(
                n.getId(),
                n.getUserId(),
                n.getMessage(),
                n.getReferenceId(),
                n.getReferenceType(),
                n.getType().name(),
                n.getIsRead(),
                n.getCreatedAt() != null ? n.getCreatedAt().toString() : null
        );
    }
}
