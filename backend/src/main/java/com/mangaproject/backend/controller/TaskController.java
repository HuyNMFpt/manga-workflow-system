package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.UserRepository;
import com.mangaproject.backend.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final UserRepository userRepository;

    /** GET /api/tasks/my — Assistant xem task của mình */
    @GetMapping("/my")
    public ApiResponse<PaginatedResponse<TaskDTO>> getMyTasks(
            Authentication authentication,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        User user = getUser(authentication);
        return ApiResponse.success(taskService.getMyTasks(user.getId(), status, page, limit));
    }

    /** GET /api/tasks/pending-review — Mangaka xem task submitted chờ duyệt */
    @GetMapping("/pending-review")
    public ApiResponse<List<TaskDTO>> getPendingReview(Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(taskService.getPendingReviewTasks(user.getId()));
    }

    /** GET /api/tasks/assigned-by-me — Mangaka xem TẤT CẢ task mình đã giao (mọi status) */
    @GetMapping("/assigned-by-me")
    public ApiResponse<List<TaskDTO>> getTasksAssignedByMe(Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(taskService.getTasksAssignedByMe(user.getId()));
    }

    /** GET /api/tasks/pages/{pageId} — Lấy tất cả task của 1 trang */
    @GetMapping("/pages/{pageId}")
    public ApiResponse<List<TaskDTO>> getTasksByPage(@PathVariable String pageId) {
        return ApiResponse.success(taskService.getTasksByPage(pageId));
    }

    /** POST /api/tasks/auto-assign — Tự động tìm assistant phù hợp cho taskType */
    @PostMapping("/auto-assign")
    public ApiResponse<java.util.Map<String, String>> autoAssign(
            @RequestBody java.util.Map<String, String> body) {
        String taskType = body.get("taskType");
        if (taskType == null || taskType.isBlank()) {
            return ApiResponse.success(
                    java.util.Map.of("reason", "error", "message", "taskType is required"));
        }
        String assignedTo = taskService.findBestAssistantPublic(taskType);
        if (assignedTo == null) {
            return ApiResponse.success(
                    java.util.Map.of(
                            "reason", "no_skill_match",
                            "message", "Không có Assistant nào có kỹ năng \"" + taskType + "\" — vui lòng chọn thủ công"));
        }
        return ApiResponse.success(
                java.util.Map.of("assignedTo", assignedTo, "reason", "skill_match"));
    }

    /** POST /api/tasks — Mangaka tạo task giao cho assistant */
    @PostMapping
    public ApiResponse<TaskDTO> createTask(
            @Valid @RequestBody CreateTaskRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        request.setAssignedBy(user.getId());
        return ApiResponse.success(taskService.createTask(request));
    }

    /** PUT /api/tasks/{taskId}/start — Assistant bắt đầu task */
    @PutMapping("/{taskId}/start")
    public ApiResponse<TaskDTO> startTask(
            @PathVariable String taskId,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(taskService.startTask(taskId, user.getId()));
    }

    /** POST /api/tasks/{taskId}/submit — Assistant nộp kết quả */
    @PostMapping("/{taskId}/submit")
    public ApiResponse<TaskDTO> submitTask(
            @PathVariable String taskId,
            @RequestParam String fileUrl,
            @RequestParam(required = false) String note,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(taskService.submitTask(taskId, user.getId(), fileUrl, note));
    }

    /** PUT /api/tasks/{taskId}/approve — Mangaka phê duyệt task */
    @PutMapping("/{taskId}/approve")
    public ApiResponse<TaskDTO> approveTask(
            @PathVariable String taskId,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(taskService.approveTask(taskId, user.getId()));
    }

    /** PUT /api/tasks/{taskId}/revision — Mangaka yêu cầu chỉnh sửa */
    @PutMapping("/{taskId}/revision")
    public ApiResponse<TaskDTO> requestRevision(
            @PathVariable String taskId,
            @RequestBody RevisionRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(taskService.requestRevision(taskId, user.getId(), request.getNote()));
    }

    /** PUT /api/tasks/{taskId} — Mangaka sửa task (assignee, deadline, priority...) */
    @PutMapping("/{taskId}")
    public ApiResponse<TaskDTO> updateTask(
            @PathVariable String taskId,
            @RequestBody UpdateTaskRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(taskService.updateTask(taskId, request, user.getId()));
    }

    /** DELETE /api/tasks/{taskId} — Mangaka huỷ task */
    @DeleteMapping("/{taskId}")
    public ApiResponse<Void> deleteTask(
            @PathVariable String taskId,
            Authentication authentication) {
        User user = getUser(authentication);
        taskService.deleteTask(taskId, user.getId());
        return ApiResponse.success(null, "Task đã được huỷ");
    }

    /**
     * PATCH /api/tasks/{taskId}/mark-paid
     * Mangaka/Editor xác nhận đã thanh toán cho Assistant
     */
    @PatchMapping("/{taskId}/mark-paid")
    public ApiResponse<TaskDTO> markPaid(
            @PathVariable String taskId,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(taskService.markPaid(taskId, user.getId()),
                "Đã xác nhận thanh toán");
    }

    private User getUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}