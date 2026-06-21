package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.*;
import com.mangaproject.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EditorService {

    private final SeriesRepository seriesRepository;
    private final ManuscriptRepository manuscriptRepository;
    private final ManuscriptAnnotationRepository annotationRepository;
    private final ChapterRepository chapterRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final SubmissionRepository submissionRepository;
    private final NotificationRepository notificationRepository;
    private final LookupResolverService lookupResolverService;

    // ── Dashboard stats ──────────────────────────────────────────
    public EditorStatsDTO getStats(String editorId) {
        // Bản thảo đang xét (submitted manuscripts của series editor này phụ trách)
        List<Series> mySeries = seriesRepository.findByEditorId(editorId);
        List<String> seriesIds = mySeries.stream().map(Series::getId).collect(Collectors.toList());

        int manuscriptsInReview = 0;
        for (String sid : seriesIds) {
            manuscriptsInReview += manuscriptRepository
                    .findBySeriesIdOrderByVersionDesc(sid).stream()
                    .filter(m -> m.getStatus() == Manuscript.ManuscriptStatus.submitted
                            || m.getStatus() == Manuscript.ManuscriptStatus.under_review)
                    .count();
        }

        int seriesSerializing = (int) mySeries.stream()
                .filter(s -> s.getStatus() == Series.SeriesStatus.publishing)
                .count();

        int seriesAtRisk = (int) mySeries.stream()
                .filter(s -> s.getCancellationRisk() != null && s.getCancellationRisk())
                .count();

        // Deadline tuần này: chapters có deadline trong 7 ngày tới
        LocalDateTime nextWeek = LocalDateTime.now().plusDays(7);
        int deadlinesThisWeek = 0;
        for (String sid : seriesIds) {
            deadlinesThisWeek += chapterRepository.findBySeries_IdOrderByChapterNumberAsc(sid).stream()
                    .filter(c -> c.getDeadline() != null
                            && c.getDeadline().atStartOfDay().isBefore(nextWeek)
                            && c.getStatus() != Chapter.ChapterStatus.published)
                    .count();
        }

        return new EditorStatsDTO(manuscriptsInReview, seriesSerializing, seriesAtRisk, deadlinesThisWeek);
    }

    // ── Studio Progress — tiến độ real-time ──────────────────────
    public List<StudioProgressDTO> getStudioProgress(String editorId) {
        List<Series> mySeries = seriesRepository.findByEditorId(editorId);
        List<StudioProgressDTO> result = new ArrayList<>();

        for (Series series : mySeries) {
            if (series.getStatus() != Series.SeriesStatus.publishing) continue;

            // Lấy chapter đang làm gần nhất
            List<Chapter> chapters = chapterRepository.findBySeries_IdOrderByChapterNumberAsc(series.getId());
            Chapter latestChapter = chapters.stream()
                    .filter(c -> c.getStatus() != Chapter.ChapterStatus.published)
                    .findFirst()
                    .orElse(chapters.isEmpty() ? null : chapters.get(chapters.size() - 1));

            if (latestChapter == null) continue;

            // Đếm tasks
            List<Task> tasks = taskRepository.findByChapterId(latestChapter.getId());
            int total = tasks.size();
            int completed = (int) tasks.stream().filter(t -> t.getStatus() == Task.TaskStatus.approved).count();
            int inProgress = (int) tasks.stream().filter(t -> t.getStatus() == Task.TaskStatus.in_progress || t.getStatus() == Task.TaskStatus.submitted).count();
            int pending = (int) tasks.stream().filter(t -> t.getStatus() == Task.TaskStatus.pending).count();

            // Quá hạn
            LocalDateTime now = LocalDateTime.now();
            int overdue = (int) tasks.stream()
                    .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(now)
                            && t.getStatus() != Task.TaskStatus.approved)
                    .count();

            // Days until deadline
            int daysLeft = latestChapter.getDeadline() != null
                    ? (int) java.time.temporal.ChronoUnit.DAYS.between(
                            java.time.LocalDate.now(), latestChapter.getDeadline())
                    : 999;

            // Danh sách assistant
            List<String> assistantNames = tasks.stream()
                    .map(Task::getAssignedTo)
                    .distinct()
                    .map(uid -> userRepository.findById(uid)
                            .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                            .orElse("Unknown"))
                    .collect(Collectors.toList());

            double percent = total > 0 ? (double) completed / total * 100 : 0;

            // Mangaka name
            String mangakaName = userRepository.findById(series.getMangakaId())
                    .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                    .orElse("Unknown");

            result.add(new StudioProgressDTO(
                    series.getId(), series.getTitle(), series.getGenre(),
                    series.getMangakaId(), mangakaName,
                    latestChapter.getChapterNumber(),
                    total, completed, inProgress, pending, overdue,
                    daysLeft, daysLeft <= 3 || overdue > 0,
                    Math.round(percent * 10.0) / 10.0,
                    assistantNames
            ));
        }

        return result;
    }

    // ── Manuscripts để review ────────────────────────────────────
    public List<ManuscriptDTO> getManuscriptsToReview(String editorId) {
        List<Series> mySeries = seriesRepository.findByEditorId(editorId);
        List<ManuscriptDTO> result = new ArrayList<>();

        for (Series series : mySeries) {
            manuscriptRepository.findBySeriesIdOrderByVersionDesc(series.getId()).stream()
                    .map(m -> {
                        List<AnnotationDTO> annotations = annotationRepository
                                .findByManuscriptIdOrderByCreatedAtAsc(m.getId()).stream()
                                .map(a -> new AnnotationDTO(
                                        a.getId(), a.getNote(), a.getTag(),
                                        a.getX(), a.getY(), a.getPageNumber(),
                                        a.getCreatedAt() != null ? a.getCreatedAt().toString() : null
                                ))
                                .collect(Collectors.toList());

                        ManuscriptDTO dto = new ManuscriptDTO(
                                m.getId(), m.getSeriesId(), series.getTitle(),
                                series.getStatus().name(),
                                m.getSubmittedBy(), m.getVersion(), m.getFileUrl(),
                                m.getDescription(), m.getStatus().name(),
                                m.getRejectionReason(),
                                m.getSubmittedAt() != null ? m.getSubmittedAt().toString() : null,
                                m.getCreatedAt() != null ? m.getCreatedAt().toString() : null,
                                annotations
                        );
                        return dto;
                    })
                    .forEach(result::add);
        }

        return result;
    }

    // ── Editor thêm annotation/comment lên manuscript ────────────
    public ManuscriptDTO addAnnotation(String manuscriptId, String editorId, AnnotateRequest request) {
        Manuscript manuscript = manuscriptRepository.findById(manuscriptId)
                .orElseThrow(() -> new RuntimeException("Manuscript not found"));

        // Lưu annotation vào bảng riêng
        ManuscriptAnnotation annotation = new ManuscriptAnnotation();
        annotation.setManuscriptId(manuscriptId);
        annotation.setEditorId(editorId);
        annotation.setNote(request.getNote() != null ? request.getNote() : "");
        annotation.setTag(request.getTag());
        annotation.setX(request.getX());
        annotation.setY(request.getY());
        annotation.setPageNumber(request.getPageNumber());
        annotationRepository.save(annotation);

        // Cập nhật status manuscript → under_review
        manuscript.setStatus(Manuscript.ManuscriptStatus.under_review);
        manuscript = manuscriptRepository.save(manuscript);

        Series series = seriesRepository.findById(manuscript.getSeriesId()).orElse(null);
        String seriesTitle = series != null ? series.getTitle() : "";

        List<AnnotationDTO> annotations = annotationRepository
                .findByManuscriptIdOrderByCreatedAtAsc(manuscriptId).stream()
                .map(a -> new AnnotationDTO(
                        a.getId(), a.getNote(), a.getTag(),
                        a.getX(), a.getY(), a.getPageNumber(),
                        a.getCreatedAt() != null ? a.getCreatedAt().toString() : null
                ))
                .collect(Collectors.toList());

        return new ManuscriptDTO(
                manuscript.getId(), manuscript.getSeriesId(), seriesTitle,
                series != null ? series.getStatus().name() : null,
                manuscript.getSubmittedBy(), manuscript.getVersion(), manuscript.getFileUrl(),
                manuscript.getDescription(), manuscript.getStatus().name(),
                manuscript.getRejectionReason(),
                manuscript.getSubmittedAt() != null ? manuscript.getSubmittedAt().toString() : null,
                manuscript.getCreatedAt() != null ? manuscript.getCreatedAt().toString() : null,
                annotations
        );
    }

    // ── Editor nộp lên Board ──────────────────────────────────────
    @org.springframework.transaction.annotation.Transactional
    public SubmissionDTO submitToBoard(String manuscriptId, String editorId, SubmitToBoardRequest request) {
        Manuscript manuscript = manuscriptRepository.findById(manuscriptId)
                .orElseThrow(() -> new RuntimeException("Manuscript not found"));

        Series series = seriesRepository.findById(manuscript.getSeriesId())
                .orElseThrow(() -> new RuntimeException("Series not found"));

        // Kiểm tra editor có phụ trách series này không
        if (!editorId.equals(series.getEditorId())) {
            throw new RuntimeException("Bạn không phụ trách series này");
        }

        // Build editor evaluation note vào description
        StringBuilder evalNote = new StringBuilder(manuscript.getDescription() != null ? manuscript.getDescription() : "");
        if (request.getAudienceSummary() != null)
            evalNote.append("\n[Audience]: ").append(request.getAudienceSummary());
        if (request.getMarketingAngle() != null)
            evalNote.append("\n[Marketing]: ").append(request.getMarketingAngle());
        if (request.getWhyItWillSell() != null)
            evalNote.append("\n[WhySell]: ").append(request.getWhyItWillSell());
        if (request.getEditorNote() != null)
            evalNote.append("\n[EditorNote]: ").append(request.getEditorNote());

        manuscript.setDescription(evalNote.toString());
        manuscript.setStatus(Manuscript.ManuscriptStatus.approved);
        manuscript.setReviewedAt(LocalDateTime.now());
        manuscriptRepository.save(manuscript);

        // Tạo Submission lên Board
        int submissionRound = (int) submissionRepository.countByManuscriptId(manuscriptId) + 1;

        Submission submission = new Submission();
        submission.setManuscriptId(manuscriptId);
        submission.setSubmittedBy(editorId);
        submission.setSubmissionRound(submissionRound);
        submission.setCoverLetter(request.getEditorNote());
        submission.setStatus(Submission.SubmissionStatus.pending);
        submission.setVotingDeadline(LocalDateTime.now().plusDays(7));

        // Lưu evaluation fields trực tiếp trên Submission (không phụ thuộc parse text từ
        // manuscript.description — manuscript có thể bị thay thế bởi version mới khi Mangaka nộp lại)
        submission.setAudienceSummary(request.getAudienceSummary());
        submission.setMarketingAngle(request.getMarketingAngle());
        submission.setWhyItWillSell(request.getWhyItWillSell());
        submission.setEditorNote(request.getEditorNote());
        submission.setRecommendedSchedule(request.getRecommendedSchedule());

        submission = submissionRepository.save(submission);

        // Update series status → submitted (chờ Board)
        series.setStatus(Series.SeriesStatus.submitted);
        seriesRepository.save(series);

        log.info("Editor submitted manuscript to board: manuscriptId={}, editorId={}", manuscriptId, editorId);

        return new SubmissionDTO(
                submission.getId(), manuscriptId, series.getId(), series.getTitle(),
                submission.getSubmittedBy(), submission.getSubmissionRound(),
                submission.getCoverLetter(), submission.getStatus().name(),
                0, 0, 0,
                submission.getVotingDeadline().toString(),
                submission.getCreatedAt() != null ? submission.getCreatedAt().toString() : null
        );
    }

    // ── Editor trả lại Mangaka để sửa ────────────────────────────
    @org.springframework.transaction.annotation.Transactional
    public ManuscriptDTO updateManuscriptStatus(String manuscriptId, String editorId, UpdateManuscriptStatusRequest request) {
        Manuscript manuscript = manuscriptRepository.findById(manuscriptId)
                .orElseThrow(() -> new RuntimeException("Manuscript not found"));

        Series series = seriesRepository.findById(manuscript.getSeriesId())
                .orElseThrow(() -> new RuntimeException("Series not found"));

        if (!editorId.equals(series.getEditorId())) {
            throw new RuntimeException("Bạn không phụ trách series này");
        }

        // Map status string → ManuscriptStatus
        Manuscript.ManuscriptStatus newStatus;
        switch (request.getStatus()) {
            case "needs_minor_revision", "needs_major_revision", "revision_requested"
                    -> newStatus = Manuscript.ManuscriptStatus.revision_requested;
            case "under_review" -> newStatus = Manuscript.ManuscriptStatus.under_review;
            case "approved" -> newStatus = Manuscript.ManuscriptStatus.approved;
            default -> throw new RuntimeException("Status không hợp lệ: " + request.getStatus());
        }

        manuscript.setStatus(newStatus);
        // Chỉ set rejectionReason nếu có nội dung (không throw khi reason là empty)
        if (request.getReason() != null && !request.getReason().isEmpty()) {
            manuscript.setRejectionReason(request.getReason());
        }
        manuscript.setReviewedAt(LocalDateTime.now());
        manuscript = manuscriptRepository.save(manuscript);

        // Chỉ về draft khi trả lại Mangaka sửa, KHÔNG về draft khi approved
        if (newStatus == Manuscript.ManuscriptStatus.revision_requested) {
            series.setStatus(Series.SeriesStatus.draft);
            seriesRepository.save(series);

            // Gửi notification cho Mangaka
            if (notificationRepository != null) {
                Notification notification = new Notification();
                notification.setUserId(series.getMangakaId());
                notification.setType(Notification.NotificationType.revision_requested);
                notification.setNotificationTypeId(
                        lookupResolverService.resolveNotificationTypeId(Notification.NotificationType.revision_requested));
                notification.setReferenceId(manuscriptId);
                notification.setReferenceType("manuscript");
                notification.setMessage(String.format(
                        "Editor yêu cầu chỉnh sửa bản thảo [%s]: %s",
                        series.getTitle(),
                        request.getReason() != null ? request.getReason() : "Vui lòng xem lại bản thảo"
                ));
                notificationRepository.save(notification);
            }
        }

        log.info("Editor requested revision: manuscriptId={}, editorId={}, status={}", manuscriptId, editorId, newStatus);

        return new ManuscriptDTO(
                manuscript.getId(), manuscript.getSeriesId(), series.getTitle(),
                series.getStatus().name(),
                manuscript.getSubmittedBy(), manuscript.getVersion(), manuscript.getFileUrl(),
                manuscript.getDescription(), manuscript.getStatus().name(),
                manuscript.getRejectionReason(),
                manuscript.getSubmittedAt() != null ? manuscript.getSubmittedAt().toString() : null,
                manuscript.getCreatedAt() != null ? manuscript.getCreatedAt().toString() : null,
                null
        );
    }}