package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.Task;
import com.mangaproject.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;

    public PaginatedResponse<TaskDTO> getMyTasks(String userId, String status, int page, int limit) {
        Pageable pageable = PageRequest.of(page - 1, limit);
        Page<Task> taskPage;

        if (status != null && !status.isEmpty()) {
            taskPage = taskRepository.findByAssignedToAndStatus(
                    userId, Task.TaskStatus.valueOf(status), pageable);
        } else {
            taskPage = taskRepository.findByAssignedTo(userId, pageable);
        }

        List<TaskDTO> tasks = taskPage.getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        return new PaginatedResponse<>(
                tasks,
                (int) taskPage.getTotalElements(),
                page,
                limit,
                taskPage.getTotalPages()
        );
    }

    public List<TaskDTO> getTasksByPage(String pageId) {
        return taskRepository.findByPageId(pageId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách task assistant đã nộp, chờ mangaka duyệt
     * PageReview frontend dùng method này
     */
    public List<TaskDTO> getPendingReviewTasks(String mangakaId) {
        return taskRepository.findByAssignedByAndStatus(
                mangakaId, Task.TaskStatus.submitted
        ).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public TaskDTO createTask(CreateTaskRequest request) {
        Task task = new Task();
        task.setPageId(request.getPageId());
        task.setAssignedTo(request.getAssignedTo());
        task.setAssignedBy(request.getAssignedBy());
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setTaskType(Task.TaskType.valueOf(request.getTaskType()));
        task.setPanelRegion(request.getPanelRegion());
        task.setPriority(Task.Priority.valueOf(
                request.getPriority() != null ? request.getPriority() : "normal"));
        task.setStatus(Task.TaskStatus.pending);
        if (request.getDueDate() != null) {
            task.setDueDate(LocalDateTime.parse(request.getDueDate()));
        }

        task = taskRepository.save(task);
        return mapToDTO(task);
    }

    public TaskDTO startTask(String taskId, String assistantId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!task.getAssignedTo().equals(assistantId)) {
            throw new RuntimeException("Bạn không có quyền thực hiện task này");
        }

        if (task.getStatus() != Task.TaskStatus.pending) {
            throw new RuntimeException("Task không ở trạng thái pending");
        }

        task.setStatus(Task.TaskStatus.in_progress);
        task = taskRepository.save(task);
        return mapToDTO(task);
    }

    public TaskDTO submitTask(String taskId, String fileUrl, String note) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        task.setStatus(Task.TaskStatus.submitted);
        task.setSubmittedAt(LocalDateTime.now());
        if (fileUrl != null) task.setResultFileUrl(fileUrl);
        if (note != null) task.setRevisionNotes(note);

        task = taskRepository.save(task);
        return mapToDTO(task);
    }

    public TaskDTO approveTask(String taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        task.setStatus(Task.TaskStatus.approved);
        task.setApprovedAt(LocalDateTime.now());

        task = taskRepository.save(task);
        return mapToDTO(task);
    }

    public TaskDTO requestRevision(String taskId, String note) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        task.setStatus(Task.TaskStatus.revision_needed);
        task.setRevisionNotes(note);

        task = taskRepository.save(task);
        return mapToDTO(task);
    }

    private TaskDTO mapToDTO(Task task) {
        TaskDTO dto = new TaskDTO();
        dto.setId(task.getId());
        dto.setPageId(task.getPageId());
        dto.setAssignedTo(task.getAssignedTo());
        dto.setAssignedBy(task.getAssignedBy());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setTaskType(task.getTaskType().name());
        dto.setPanelRegion(task.getPanelRegion());
        dto.setPriority(task.getPriority().name());
        dto.setStatus(task.getStatus().name());
        dto.setRevisionNotes(task.getRevisionNotes());
        dto.setFileUrl(task.getResultFileUrl());
        dto.setDueDate(task.getDueDate() != null ? task.getDueDate().toString() : null);
        dto.setSubmittedAt(task.getSubmittedAt() != null ? task.getSubmittedAt().toString() : null);
        dto.setApprovedAt(task.getApprovedAt() != null ? task.getApprovedAt().toString() : null);
        dto.setCreatedAt(task.getCreatedAt().toString());
        dto.setUpdatedAt(task.getUpdatedAt() != null ? task.getUpdatedAt().toString() : null);
        return dto;
    }
}