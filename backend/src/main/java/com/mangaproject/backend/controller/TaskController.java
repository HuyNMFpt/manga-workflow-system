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

    /**
     * GET /api/tasks/my
     * Assistant xem task được giao cho mình
     */
    @GetMapping("/my")
    public ApiResponse<PaginatedResponse<TaskDTO>> getMyTasks(
            Authentication authentication,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        User user = getUser(authentication);
        return ApiResponse.success(taskService.getMyTasks(user.getId(), status, page, limit));
    }

    /**
     * GET /api/tasks/pending-review
     * Mangaka xem task của trợ lý đã submit, chờ mình duyệt
     * PageReview frontend dùng endpoint này
     */
    @GetMapping("/pending-review")
    public ApiResponse<List<TaskDTO>> getPendingReview(Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(taskService.getPendingReviewTasks(user.getId()));
    }

    /**
     * GET /api/tasks/pages/{pageId}
     * Lấy tất cả task của 1 trang
     */
    @GetMapping("/pages/{pageId}")
    public ApiResponse<List<TaskDTO>> getTasksByPage(@PathVariable String pageId) {
        return ApiResponse.success(taskService.getTasksByPage(pageId));
    }

    /**
     * POST /api/tasks
     * Mangaka tạo task giao cho assistant (TaskAssignment)
     */
    @PostMapping
    public ApiResponse<TaskDTO> createTask(
            @Valid @RequestBody CreateTaskRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        request.setAssignedBy(user.getId());
        return ApiResponse.success(taskService.createTask(request));
    }

    /**
     * POST /api/tasks/{taskId}/submit
     * Assistant nộp kết quả
     */
    @PostMapping("/{taskId}/submit")
    public ApiResponse<TaskDTO> submitTask(
            @PathVariable String taskId,
            @RequestParam String fileUrl,
            @RequestParam(required = false) String note) {
        return ApiResponse.success(taskService.submitTask(taskId, fileUrl, note));
    }

    /**
     * PUT /api/tasks/{taskId}/approve
     * Mangaka phê duyệt task (PageReview)
     */
    @PutMapping("/{taskId}/approve")
    public ApiResponse<TaskDTO> approveTask(@PathVariable String taskId) {
        return ApiResponse.success(taskService.approveTask(taskId));
    }

    /**
     * PUT /api/tasks/{taskId}/revision
     * Mangaka yêu cầu chỉnh sửa (PageReview)
     */
    @PutMapping("/{taskId}/revision")
    public ApiResponse<TaskDTO> requestRevision(
            @PathVariable String taskId,
            @RequestBody RevisionRequest request) {
        return ApiResponse.success(taskService.requestRevision(taskId, request.getNote()));
    }

    private User getUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}