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

    public TaskDTO submitTask(String taskId, String fileUrl, String note) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        task.setStatus(Task.TaskStatus.submitted);
        task.setSubmittedAt(LocalDateTime.now());

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
        return new TaskDTO(
                task.getId(),
                task.getPageId(),
                task.getAssignedTo(),
                task.getAssignedBy(),
                task.getTitle(),
                task.getDescription(),
                task.getTaskType().name(),
                task.getPanelRegion(),
                task.getPriority().name(),
                task.getStatus().name(),
                task.getRevisionNotes(),
                task.getDueDate() != null ? task.getDueDate().toString() : null,
                task.getSubmittedAt() != null ? task.getSubmittedAt().toString() : null,
                task.getApprovedAt() != null ? task.getApprovedAt().toString() : null,
                task.getCreatedAt().toString(),
                task.getUpdatedAt() != null ? task.getUpdatedAt().toString() : null
        );
    }
}