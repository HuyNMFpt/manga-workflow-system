package com.mangaproject.backend.service;
import com.mangaproject.backend.model.Notification;
import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.Chapter;
import com.mangaproject.backend.model.Page;
import com.mangaproject.backend.model.Task;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final PriorityLookupRepository priorityLookupRepository;
    private final TaskTypeLookupRepository taskTypeLookupRepository;
    private final PageRepository pageRepository;
    private final ChapterRepository chapterRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final LookupResolverService lookupResolverService;

    public PaginatedResponse<TaskDTO> getMyTasks(String userId, String status, int page, int limit) {
        Pageable pageable = PageRequest.of(page - 1, limit);
        org.springframework.data.domain.Page<Task> taskPage;
        if (status != null && !status.isEmpty()) {
            taskPage = taskRepository.findByAssignedToAndStatus(userId, Task.TaskStatus.valueOf(status), pageable);
        } else {
            taskPage = taskRepository.findByAssignedTo(userId, pageable);
        }
        List<TaskDTO> tasks = mapToDTOList(taskPage.getContent());
        return new PaginatedResponse<>(tasks, (int) taskPage.getTotalElements(), page, limit, taskPage.getTotalPages());
    }

    public List<TaskDTO> getTasksByPage(String pageId) {
        return mapToDTOList(taskRepository.findByPageId(pageId));
    }

    public List<TaskDTO> getPendingReviewTasks(String mangakaId) {
        return mapToDTOList(taskRepository.findByAssignedByAndStatus(mangakaId, Task.TaskStatus.submitted));
    }

    public List<TaskDTO> getTasksAssignedByMe(String mangakaId) {
        return mapToDTOList(taskRepository.findByAssignedBy(mangakaId));
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

        // Notification: thông báo cho Assistant được giao task
        try {
            Notification notif = new Notification();
            notif.setUserId(task.getAssignedTo());
            notif.setType(Notification.NotificationType.task_assigned);
            notif.setNotificationTypeId(
                    lookupResolverService.resolveNotificationTypeId(Notification.NotificationType.task_assigned));
            notif.setReferenceId(task.getId());
            notif.setReferenceType("task");
            notif.setMessage(String.format("Bạn được giao task mới: %s", task.getTitle()));
            notificationRepository.save(notif);
        } catch (Exception e) {
            log.warn("Failed to send task_assigned notification: {}", e.getMessage());
        }

        return mapToDTO(task, null, null, null);
    }

    // BR-01: pending | revision_needed → in_progress
    // BR-02: chỉ assignee mới được start
    public TaskDTO startTask(String taskId, String assistantId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task không tồn tại"));
        if (!task.getAssignedTo().equals(assistantId))
            throw new RuntimeException("Bạn không có quyền thực hiện task này");
        if (task.getStatus() != Task.TaskStatus.pending && task.getStatus() != Task.TaskStatus.revision_needed)
            throw new RuntimeException("Không thể bắt đầu task ở trạng thái: " + task.getStatus().name()
                    + " (chỉ cho phép: pending, revision_needed)");
        task.setStatus(Task.TaskStatus.in_progress);
        return mapToDTO(taskRepository.save(task), null, null, null);
    }

    // BR-01: in_progress → submitted
    // BR-02: chỉ assignee mới được submit
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
        return mapToDTO(taskRepository.save(task), null, null, null);
    }

    // BR-01: submitted → approved
    // BR-02: chỉ assignedBy (mangaka) mới được approve
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
        task = taskRepository.save(task); // reassign để lấy updatedAt mới nhất

        // Auto-approve chapter nếu tất cả task đã approved — dùng COUNT query tối ưu
        autoApproveChapterIfDone(task.getPageId());

        // Notification: thông báo cho Assistant task đã được duyệt
        try {
            Notification notif = new Notification();
            notif.setUserId(task.getAssignedTo());
            notif.setType(Notification.NotificationType.task_approved);
            notif.setNotificationTypeId(
                    lookupResolverService.resolveNotificationTypeId(Notification.NotificationType.task_approved));
            notif.setReferenceId(task.getId());
            notif.setReferenceType("task");
            notif.setMessage(String.format("Task '%s' của bạn đã được duyệt!", task.getTitle()));
            notificationRepository.save(notif);
        } catch (Exception e) {
            log.warn("Failed to send task_approved notification: {}", e.getMessage());
        }

        return mapToDTO(task, null, null, null);
    }

    // BR-01: submitted → revision_needed
    // BR-02: chỉ assignedBy (mangaka) mới được request revision
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
        return mapToDTO(taskRepository.save(task), null, null, null);
    }

    // ── Tối ưu: dùng COUNT query thay vì load toàn bộ tasks ──────
    private void autoApproveChapterIfDone(String pageId) {
        try {
            Page page = pageRepository.findById(pageId).orElse(null);
            if (page == null) return;

            Chapter chapter = page.getChapter();
            if (chapter == null || chapter.getStatus() == Chapter.ChapterStatus.published) return;

            String chapterId = chapter.getId();
            long total = taskRepository.countByChapterId(chapterId);
            if (total == 0) return; // không có task nào → không auto-approve

            long nonApproved = taskRepository.countNonApprovedByChapterId(chapterId);
            if (nonApproved == 0) {
                chapter.setStatus(Chapter.ChapterStatus.approved);
                chapterRepository.save(chapter);
                log.info("Chapter {} '{}' auto-approved — tất cả {} task đã hoàn chỉnh",
                        chapterId, chapter.getTitle(), total);
            }
        } catch (Exception e) {
            log.warn("autoApproveChapter failed for pageId={}: {}", pageId, e.getMessage());
        }
    }

    // ── Tối ưu: batch load để tránh N+1 queries ──────────────────
    private List<TaskDTO> mapToDTOList(List<Task> tasks) {
        if (tasks == null || tasks.isEmpty()) return Collections.emptyList();

        // Batch load pages
        Set<String> pageIds = tasks.stream().map(Task::getPageId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, Page> pageMap = pageRepository.findAllById(pageIds).stream()
                .collect(Collectors.toMap(Page::getId, p -> p));

        // Batch load users (assignedTo + assignedBy)
        Set<String> userIds = tasks.stream()
                .flatMap(t -> Stream.of(t.getAssignedTo(), t.getAssignedBy()))
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        return tasks.stream()
                .map(t -> mapToDTO(t, pageMap.get(t.getPageId()), userMap.get(t.getAssignedTo()), userMap.get(t.getAssignedBy())))
                .collect(Collectors.toList());
    }

    private TaskDTO mapToDTO(Task task, Page page, User assignedToUser, User assignedByUser) {
        TaskDTO dto = new TaskDTO();
        dto.setId(task.getId());
        dto.setPageId(task.getPageId());
        dto.setAssignedTo(task.getAssignedTo());
        dto.setAssignedBy(task.getAssignedBy());

        // Tên user — dùng từ batch map nếu có, fallback query DB
        if (assignedToUser != null) {
            dto.setAssignedToName(assignedToUser.getName() != null ? assignedToUser.getName() : assignedToUser.getUsername());
        } else {
            dto.setAssignedToName(userRepository.findById(task.getAssignedTo())
                    .map(u -> u.getName() != null ? u.getName() : u.getUsername()).orElse(task.getAssignedTo()));
        }
        if (assignedByUser != null) {
            dto.setAssignedByName(assignedByUser.getName() != null ? assignedByUser.getName() : assignedByUser.getUsername());
        } else {
            dto.setAssignedByName(userRepository.findById(task.getAssignedBy())
                    .map(u -> u.getName() != null ? u.getName() : u.getUsername()).orElse(task.getAssignedBy()));
        }

        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setTaskType(task.getTaskType().name());
        dto.setPanelRegion(task.getPanelRegion());
        dto.setPriority(task.getPriority().name());
        dto.setStatus(task.getStatus().name());
        dto.setRevisionNotes(task.getRevisionNotes());
        dto.setFileUrl(task.getResultFileUrl());

        // pageImageUrl từ batch map
        if (page != null) {
            dto.setPageImageUrl(page.getImageUrl());
        } else {
            try {
                pageRepository.findById(task.getPageId())
                        .ifPresent(p -> dto.setPageImageUrl(p.getImageUrl()));
            } catch (Exception e) {
                dto.setPageImageUrl(null);
            }
        }

        dto.setDueDate(task.getDueDate() != null ? task.getDueDate().toString() : null);
        dto.setSubmittedAt(task.getSubmittedAt() != null ? task.getSubmittedAt().toString() : null);
        dto.setApprovedAt(task.getApprovedAt() != null ? task.getApprovedAt().toString() : null);
        dto.setCreatedAt(task.getCreatedAt().toString());
        dto.setUpdatedAt(task.getUpdatedAt() != null ? task.getUpdatedAt().toString() : null);
        return dto;
    }
}