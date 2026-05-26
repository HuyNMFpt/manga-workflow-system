package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping("/my")
    public ApiResponse<PaginatedResponse<TaskDTO>> getMyTasks(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.success(taskService.getMyTasks(userId, status, page, limit));
    }

    @GetMapping("/pages/{pageId}")
    public ApiResponse<List<TaskDTO>> getTasksByPage(@PathVariable String pageId) {
        return ApiResponse.success(taskService.getTasksByPage(pageId));
    }

    @PostMapping
    public ApiResponse<TaskDTO> createTask(@Valid @RequestBody CreateTaskRequest request) {
        return ApiResponse.success(taskService.createTask(request));
    }

    @PostMapping("/{taskId}/submit")
    public ApiResponse<TaskDTO> submitTask(
            @PathVariable String taskId,
            @RequestParam String fileUrl,
            @RequestParam(required = false) String note) {
        return ApiResponse.success(taskService.submitTask(taskId, fileUrl, note));
    }

    @PutMapping("/{taskId}/approve")
    public ApiResponse<TaskDTO> approveTask(@PathVariable String taskId) {
        return ApiResponse.success(taskService.approveTask(taskId));
    }

    @PutMapping("/{taskId}/revision")
    public ApiResponse<TaskDTO> requestRevision(
            @PathVariable String taskId,
            @RequestBody RevisionRequest request) {
        return ApiResponse.success(taskService.requestRevision(taskId, request.getNote()));
    }
}