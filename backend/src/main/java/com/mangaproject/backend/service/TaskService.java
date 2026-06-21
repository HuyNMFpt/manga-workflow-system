package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.Chapter;
import com.mangaproject.backend.model.Page;
import com.mangaproject.backend.model.Task;
import com.mangaproject.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final PriorityLookupRepository priorityLookupRepository;
    private final TaskTypeLookupRepository taskTypeLookupRepository;
    private final PageRepository pageRepository;
    private final ChapterRepository chapterRepository;

    public PaginatedResponse<TaskDTO> getMyTasks(String userId, String status, int page, int limit) {
        Pageable pageable = PageRequest.of(page - 1, limit);
        org.springframework.data.domain.Page<Task> taskPage;
        if (status != null && !status.isEmpty()) {
            taskPage = taskRepository.findByAssignedToAndStatus(userId, Task.TaskStatus.valueOf(status), pageable);
        } else {
            taskPage = taskRepository.findByAssignedTo(userId, pageable);
        }
        List<TaskDTO> tasks = taskPage.getContent().stream().map(this::mapToDTO).collect(Collectors.toList());
        return new PaginatedResponse<>(tasks, (int) taskPage.getTotalElements(), page, limit, taskPage.getTotalPages());
    }

    public List<TaskDTO> getTasksByPage(String pageId) {
        return taskRepository.findByPageId(pageId).stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /** Mangaka xem task submitted chờ duyệt */
    public List<TaskDTO> getPendingReviewTasks(String mangakaId) {
        return taskRepository.findByAssignedByAndStatus(mangakaId, Task.TaskStatus.submitted)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /** Mangaka xem TẤT CẢ task mình đã giao (mọi status) — GET /tasks/assigned-by-me */
    public List<TaskDTO> getTasksAssignedByMe(String mangakaId) {
        return taskRepository.findByAssignedBy(mangakaId)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public TaskDTO createTask(CreateTaskRequest request) {
        Task task = new Task();
        task.setPageId(request.getPageId());
        task.setAssignedTo(request.getAssignedTo());
        task.setAssignedBy(request.getAssignedBy());
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());

        String taskTypeName = request.getTaskType();
        task.setTaskType(Task.TaskType.valueOf(taskTypeName));
        task.setTaskTypeId(taskTypeLookupRepository.findByName(taskTypeName)
                .orElseThrow(() -> new RuntimeException("Loại task không hợp lệ: " + taskTypeName)).getId());

        task.setPanelRegion(request.getPanelRegion());

        String priorityName = request.getPriority() != null ? request.getPriority() : "normal";
        task.setPriority(Task.Priority.valueOf(priorityName));
        task.setPriorityId(priorityLookupRepository.findByName(priorityName)
                .orElseThrow(() -> new RuntimeException("Độ ưu tiên không hợp lệ: " + priorityName)).getId());

        task.setStatus(Task.TaskStatus.pending);
        if (request.getDueDate() != null) task.setDueDate(LocalDateTime.parse(request.getDueDate()));

        task = taskRepository.save(task);
        return mapToDTO(task);
    }

    /**
     * BR-01: pending | revision_needed → in_progress
     * BR-02: chỉ assignee mới được start
     */
    public TaskDTO startTask(String taskId, String assistantId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task không tồn tại"));
        if (!task.getAssignedTo().equals(assistantId))
            throw new RuntimeException("Bạn không có quyền thực hiện task này");
        if (task.getStatus() != Task.TaskStatus.pending && task.getStatus() != Task.TaskStatus.revision_needed)
            throw new RuntimeException("Không thể bắt đầu task ở trạng thái: " + task.getStatus().name()
                    + " (chỉ cho phép: pending, revision_needed)");
        task.setStatus(Task.TaskStatus.in_progress);
        return mapToDTO(taskRepository.save(task));
    }

    /**
     * BR-01: in_progress → submitted
     * BR-02: chỉ assignee mới được submit
     */
    public TaskDTO submitTask(String taskId, String assistantId, String fileUrl, String note) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task không tồn tại"));
        if (!task.getAssignedTo().equals(assistantId))
            throw new RuntimeException("Bạn không có quyền nộp task này");
        if (task.getStatus() != Task.TaskStatus.in_progress)
            throw new RuntimeException("Không thể nộp task ở trạng thái: " + task.getStatus().name()
                    + " (chỉ cho phép: in_progress)");
        task.setStatus(Task.TaskStatus.submitted);
        task.setSubmittedAt(LocalDateTime.now());
        if (fileUrl != null) task.setResultFileUrl(fileUrl);
        if (note != null) task.setRevisionNotes(note);
        return mapToDTO(taskRepository.save(task));
    }

    /**
     * BR-01: submitted → approved
     * BR-02: chỉ assignedBy (mangaka) mới được approve
     * Auto-approve chapter nếu tất cả task đã approved
     */
    public TaskDTO approveTask(String taskId, String mangakaId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task không tồn tại"));
        if (!task.getAssignedBy().equals(mangakaId))
            throw new RuntimeException("Bạn không có quyền duyệt task này");
        if (task.getStatus() != Task.TaskStatus.submitted)
            throw new RuntimeException("Không thể duyệt task ở trạng thái: " + task.getStatus().name()
                    + " (chỉ cho phép: submitted)");

        task.setStatus(Task.TaskStatus.approved);
        task.setApprovedAt(LocalDateTime.now());
        taskRepository.save(task);

        // Auto-approve chapter nếu tất cả task của chapter đã approved
        autoApproveChapterIfDone(task.getPageId());

        return mapToDTO(task);
    }

    /**
     * BR-01: submitted → revision_needed
     * BR-02: chỉ assignedBy (mangaka) mới được request revision
     */
    public TaskDTO requestRevision(String taskId, String mangakaId, String note) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task không tồn tại"));
        if (!task.getAssignedBy().equals(mangakaId))
            throw new RuntimeException("Bạn không có quyền yêu cầu sửa task này");
        if (task.getStatus() != Task.TaskStatus.submitted)
            throw new RuntimeException("Không thể yêu cầu sửa task ở trạng thái: " + task.getStatus().name()
                    + " (chỉ cho phép: submitted)");
        if (note == null || note.isBlank())
            throw new RuntimeException("Cần ghi rõ lý do yêu cầu sửa");
        task.setStatus(Task.TaskStatus.revision_needed);
        task.setRevisionNotes(note);
        return mapToDTO(taskRepository.save(task));
    }

    /** Tự động chuyển chapter → approved khi tất cả task của chapter đã approved */
    private void autoApproveChapterIfDone(String pageId) {
        try {
            Page page = pageRepository.findById(pageId).orElse(null);
            if (page == null) return;

            Chapter chapter = page.getChapter();
            if (chapter == null || chapter.getStatus() == Chapter.ChapterStatus.published) return;

            // Lấy tất cả pages của chapter
            List<Page> allPages = pageRepository.findByChapter_IdOrderByPageNumberAsc(chapter.getId());
            if (allPages.isEmpty()) return;

            // Kiểm tra tất cả pages đều có task và tất cả task đều approved
            boolean allDone = allPages.stream().allMatch(p -> {
                List<Task> pageTasks = taskRepository.findByPageId(p.getId());
                return !pageTasks.isEmpty() && pageTasks.stream()
                        .allMatch(t -> t.getStatus() == Task.TaskStatus.approved);
            });

            if (allDone) {
                chapter.setStatus(Chapter.ChapterStatus.approved);
                chapterRepository.save(chapter);
                log.info("Chapter {} auto-approved — tất cả task đã hoàn chỉnh", chapter.getId());
            }
        } catch (Exception e) {
            log.warn("autoApproveChapter failed for pageId={}: {}", pageId, e.getMessage());
        }
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
        // pageImageUrl — lấy raw_file_url từ pages table
        try {
            Page page = pageRepository.findById(task.getPageId()).orElse(null);
            dto.setPageImageUrl(page != null ? page.getImageUrl() : null);
        } catch (Exception e) {
            dto.setPageImageUrl(null);
        }
        dto.setDueDate(task.getDueDate() != null ? task.getDueDate().toString() : null);
        dto.setSubmittedAt(task.getSubmittedAt() != null ? task.getSubmittedAt().toString() : null);
        dto.setApprovedAt(task.getApprovedAt() != null ? task.getApprovedAt().toString() : null);
        dto.setCreatedAt(task.getCreatedAt().toString());
        dto.setUpdatedAt(task.getUpdatedAt() != null ? task.getUpdatedAt().toString() : null);
        return dto;
    }
}