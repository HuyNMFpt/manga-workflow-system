package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.Chapter;
import com.mangaproject.backend.model.Notification;
import com.mangaproject.backend.model.Page;
import com.mangaproject.backend.model.Task;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
    private final ChapterService chapterService;
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
        // Mục 2: Chặn task song song — 1 trang chỉ có 1 task active tại 1 thời điểm
        List<Task> existingTasks = taskRepository.findByPageId(request.getPageId());
        boolean hasActiveTask = existingTasks.stream()
                .anyMatch(t -> t.getStatus() != Task.TaskStatus.approved);
        if (hasActiveTask) {
            Task active = existingTasks.stream()
                    .filter(t -> t.getStatus() != Task.TaskStatus.approved)
                    .findFirst().orElseThrow();
            throw new RuntimeException(
                    "Trang này đang có task chưa hoàn thành (" + active.getTaskType().name()
                            + " — " + active.getStatus().name() + "). Chờ duyệt xong mới giao task tiếp theo.");
        }

        Task task = new Task();
        task.setPageId(request.getPageId());

        // Skill-matching: nếu không chỉ định → tự tìm assistant phù hợp
        String assignedTo = request.getAssignedTo();
        if (assignedTo == null || assignedTo.isBlank()) {
            assignedTo = findBestAssistant(request.getTaskType());
        }
        task.setAssignedTo(assignedTo);
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
        if (request.getDueDate() != null) task.setDueDate(java.time.LocalDate.parse(request.getDueDate()).atStartOfDay());

        // Đơn giá: dùng giá Mangaka nhập nếu có, không thì dùng giá mặc định theo loại task
        java.math.BigDecimal paymentAmount = request.getPaymentAmount();
        if (paymentAmount == null || paymentAmount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            paymentAmount = defaultPaymentAmount(task.getTaskType());
        }
        task.setPaymentAmount(paymentAmount);

        Task saved = taskRepository.save(task);

        // Gửi notification task_assigned cho Assistant
        Page page = pageRepository.findById(request.getPageId()).orElse(null);
        int pageNum = page != null ? page.getPageNumber() : 0;
        Notification notif = new Notification();
        notif.setUserId(saved.getAssignedTo());
        notif.setType(Notification.NotificationType.task_assigned);
        notif.setNotificationTypeId(lookupResolverService.resolveNotificationTypeId(
                Notification.NotificationType.task_assigned));
        notif.setMessage(String.format("Bạn được giao task mới: %s (trang %d)",
                saved.getTaskType().name(), pageNum));
        notif.setReferenceId(saved.getId());
        notif.setReferenceType("task");
        notificationRepository.save(notif);

        return mapToDTO(saved, null, null, null);
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

        // Gửi notification task_approved cho Assistant
        Notification approveNotif = new Notification();
        approveNotif.setUserId(task.getAssignedTo());
        approveNotif.setType(Notification.NotificationType.task_approved);
        approveNotif.setNotificationTypeId(lookupResolverService.resolveNotificationTypeId(
                Notification.NotificationType.task_approved));
        approveNotif.setMessage("Task của bạn đã được duyệt: " + task.getTaskType().name());
        approveNotif.setReferenceId(task.getId());
        approveNotif.setReferenceType("task");
        notificationRepository.save(approveNotif);

        // Auto-approve chapter nếu tất cả task đã approved — dùng COUNT query tối ưu
        autoApproveChapterIfDone(task.getPageId());

        // Mục 1: ghi resultFileUrl của task vào page.imageUrl
        final String resultFileUrl = task.getResultFileUrl();
        final String pageId = task.getPageId();
        if (resultFileUrl != null && !resultFileUrl.isBlank()) {
            pageRepository.findById(pageId).ifPresent(page -> {
                page.setImageUrl(resultFileUrl);
                pageRepository.save(page); // trigger @UpdateTimestamp
                log.info("Page imageUrl updated from task result: pageId={}", page.getId());
            });
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
        Task saved = taskRepository.save(task);

        // Gửi notification revision_requested cho Assistant
        Notification revNotif = new Notification();
        revNotif.setUserId(saved.getAssignedTo());
        revNotif.setType(Notification.NotificationType.revision_requested);
        revNotif.setNotificationTypeId(lookupResolverService.resolveNotificationTypeId(
                Notification.NotificationType.revision_requested));
        revNotif.setMessage("Task của bạn cần chỉnh sửa: " + saved.getTaskType().name() + " — " + note);
        revNotif.setReferenceId(saved.getId());
        revNotif.setReferenceType("task");
        notificationRepository.save(revNotif);

        return mapToDTO(saved, null, null, null);
    }

    // ── Mangaka sửa task (chỉ pending/revision_needed) ───────────
    @Transactional
    public TaskDTO updateTask(String taskId, UpdateTaskRequest request, String mangakaId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task không tồn tại"));
        if (!task.getAssignedBy().equals(mangakaId))
            throw new RuntimeException("Bạn không có quyền sửa task này");
        if (task.getStatus() != Task.TaskStatus.pending
                && task.getStatus() != Task.TaskStatus.revision_needed)
            throw new RuntimeException("Chỉ có thể sửa task ở trạng thái pending hoặc revision_needed");

        // Đổi assignee → gửi notification cho assistant mới
        if (request.getAssignedTo() != null && !request.getAssignedTo().equals(task.getAssignedTo())) {
            String oldAssignee = task.getAssignedTo();
            task.setAssignedTo(request.getAssignedTo());

            // Notify assistant mới
            Notification newNotif = new Notification();
            newNotif.setUserId(request.getAssignedTo());
            newNotif.setType(Notification.NotificationType.task_assigned);
            newNotif.setNotificationTypeId(lookupResolverService.resolveNotificationTypeId(
                    Notification.NotificationType.task_assigned));
            newNotif.setMessage("Bạn được giao task mới: " + task.getTaskType().name());
            newNotif.setReferenceId(task.getId());
            newNotif.setReferenceType("task");
            notificationRepository.save(newNotif);
        }

        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getPriority() != null) {
            try { task.setPriority(Task.Priority.valueOf(request.getPriority())); }
            catch (IllegalArgumentException ignored) {}
        }
        if (request.getDueDate() != null) {
            task.setDueDate(java.time.LocalDate.parse(request.getDueDate()).atStartOfDay());
        }
        if (request.getPaymentAmount() != null
                && request.getPaymentAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
            task.setPaymentAmount(request.getPaymentAmount());
        }

        return mapToDTO(taskRepository.save(task), null, null, null);
    }

    // ── Mangaka huỷ task (chỉ pending) ───────────────────────────
    @Transactional
    public void deleteTask(String taskId, String mangakaId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task không tồn tại"));
        if (!task.getAssignedBy().equals(mangakaId))
            throw new RuntimeException("Bạn không có quyền huỷ task này");
        if (task.getStatus() != Task.TaskStatus.pending)
            throw new RuntimeException("Chỉ có thể huỷ task ở trạng thái pending");

        taskRepository.delete(task);
        log.info("Task deleted: taskId={}, by mangakaId={}", taskId, mangakaId);
    }

    // ── Tối ưu: dùng COUNT query thay vì load toàn bộ tasks ──────
    private void autoApproveChapterIfDone(String pageId) {
        try {
            Page page = pageRepository.findById(pageId).orElse(null);
            if (page == null) return;

            Chapter chapter = page.getChapter();
            if (chapter == null || chapter.getStatus() == Chapter.ChapterStatus.published) return;

            // Dùng refreshStatusIfReady thay vì đếm task trực tiếp
            // — xử lý đúng cả case 0 task lẫn case đã hết task
            chapterService.refreshStatusIfReady(chapter.getId());
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

    // ── Xác nhận đã thanh toán ───────────────────────────────────
    @Transactional
    public TaskDTO markPaid(String taskId, String userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task không tồn tại"));
        if (task.getStatus() != Task.TaskStatus.approved) {
            throw new RuntimeException("Chỉ có thể xác nhận thanh toán cho task đã được duyệt");
        }
        task.setIsPaid(true);
        log.info("Task marked as paid: taskId={}, by={}", taskId, userId);
        return mapToDTO(taskRepository.save(task), null, null, null);
    }

    // ── Giá mặc định theo loại task (VND) ───────────────────────
    private static java.math.BigDecimal defaultPaymentAmount(Task.TaskType taskType) {
        if (taskType == null) return new java.math.BigDecimal("20000");
        return switch (taskType) {
            case background  -> new java.math.BigDecimal("50000");
            case shading     -> new java.math.BigDecimal("40000");
            case effect      -> new java.math.BigDecimal("35000");
            case screentone  -> new java.math.BigDecimal("30000");
            case dialog      -> new java.math.BigDecimal("25000");
            case touch_up    -> new java.math.BigDecimal("20000");
            default          -> new java.math.BigDecimal("20000");
        };
    }

    // Public wrapper — dùng cho /tasks/auto-assign endpoint
    public String findBestAssistantPublic(String taskType) {
        return findBestAssistant(taskType);
    }

    // ── Skill-matching: tìm assistant phù hợp với task type ─────
    private String findBestAssistant(String taskType) {
        List<com.mangaproject.backend.model.User> assistants =
                userRepository.findByRole_NameAndIsActiveTrue("assistant");
        if (assistants.isEmpty()) return null;

        List<String> ids = assistants.stream()
                .map(com.mangaproject.backend.model.User::getId).toList();
        java.util.Map<String, Long> loadMap = taskRepository.countActiveTasksByAssistants(ids)
                .stream().collect(java.util.stream.Collectors.toMap(
                        row -> (String) row[0], row -> (Long) row[1]));

        // Chỉ assign khi có skill khớp — không fallback
        // Nếu không ai có skill khớp → trả null, Mangaka tự assign thủ công
        return assistants.stream()
                .filter(a -> {
                    String skills = a.getSkills();
                    return skills != null && skills.contains("\"" + taskType + "\"");
                })
                .min(java.util.Comparator.comparingLong(
                        a -> loadMap.getOrDefault(a.getId(), 0L)))
                .map(com.mangaproject.backend.model.User::getId)
                .orElse(null); // null → frontend hiện cảnh báo đỏ, Mangaka tự chọn
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
        dto.setPaymentAmount(task.getPaymentAmount());
        dto.setIsPaid(Boolean.TRUE.equals(task.getIsPaid()));
        return dto;
    }
}