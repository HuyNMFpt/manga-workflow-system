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

    public TaskDTO createTask(CreateTaskRequest request) {
        Task task = new Task();
        task.setPageId(request.getPageId());
        task.setChapterId(request.getChapterId());
        task.setSeriesId(request.getSeriesId());
        task.setAssignedTo(request.getAssignedTo());
        task.setTaskType(Task.TaskType.valueOf(request.getTaskType()));
        task.setRegionData(request.getRegionData());
        task.setInstructions(request.getInstructions());
        task.setStatus(Task.TaskStatus.assigned);
        task.setDeadline(LocalDateTime.parse(request.getDeadline()));

        task = taskRepository.save(task);
        return mapToDTO(task);
    }

    public TaskDTO submitTask(String taskId, String fileUrl, String note) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        task.setSubmissionUrl(fileUrl);
        task.setStatus(Task.TaskStatus.submitted);
        task.setUpdatedAt(LocalDateTime.now());

        task = taskRepository.save(task);
        return mapToDTO(task);
    }

    public TaskDTO approveTask(String taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        task.setStatus(Task.TaskStatus.approved);
        task.setUpdatedAt(LocalDateTime.now());

        task = taskRepository.save(task);
        return mapToDTO(task);
    }

    public TaskDTO requestRevision(String taskId, String note) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        task.setStatus(Task.TaskStatus.revision_required);
        task.setRevisionNote(note);
        task.setUpdatedAt(LocalDateTime.now());

        task = taskRepository.save(task);
        return mapToDTO(task);
    }

    private TaskDTO mapToDTO(Task task) {
        return new TaskDTO(
                task.getId(),
                task.getPageId(),
                task.getChapterId(),
                task.getSeriesId(),
                task.getAssignedTo(),
                task.getTaskType().name(),
                task.getRegionData(),
                task.getInstructions(),
                task.getStatus().name(),
                task.getSubmissionUrl(),
                task.getRevisionNote(),
                task.getDeadline().toString(),
                task.getCreatedAt().toString(),
                task.getUpdatedAt() != null ? task.getUpdatedAt().toString() : null
        );
    }
}