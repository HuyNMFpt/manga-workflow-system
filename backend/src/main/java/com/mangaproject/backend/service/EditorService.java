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
    private final ManuscriptPageRepository manuscriptPageRepository;
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

            List<Chapter> chapters = chapterRepository.findBySeries_IdOrderByChapterNumberAsc(series.getId());

            // TODO 2: Đếm published và approved chapters
            int publishedChapters = (int) chapters.stream()
                    .filter(c -> c.getStatus() == Chapter.ChapterStatus.published).count();
            int approvedChapters = (int) chapters.stream()
                    .filter(c -> c.getStatus() == Chapter.ChapterStatus.approved).count();

            // Chapter summary list cho Editor chọn publish
            List<com.mangaproject.backend.dto.ChapterSummaryDTO> chapterSummaries = chapters.stream()
                    .map(c -> new com.mangaproject.backend.dto.ChapterSummaryDTO(
                            c.getId(), c.getChapterNumber(), c.getTitle(),
                            c.getStatus().name(),
                            c.getPages() != null ? c.getPages().size() : c.getTotalPages(),
                            c.getDeadline() != null ? c.getDeadline().toString() : null,
                            c.getPublishedAt() != null ? c.getPublishedAt().toString() : null))
                    .collect(Collectors.toList());

            // Chapter đang làm gần nhất
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

            LocalDateTime now = LocalDateTime.now();
            int overdue = (int) tasks.stream()
                    .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(now)
                            && t.getStatus() != Task.TaskStatus.approved).count();

            int daysLeft = latestChapter.getDeadline() != null
                    ? (int) java.time.temporal.ChronoUnit.DAYS.between(
                    java.time.LocalDate.now(), latestChapter.getDeadline()) : 999;

            List<String> assistantNames = tasks.stream()
                    .map(Task::getAssignedTo)
                    .distinct()
                    .map(uid -> userRepository.findById(uid)
                            .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                            .orElse("Unknown"))
                    .collect(Collectors.toList());

            double percent = total > 0 ? (double) completed / total * 100 : 0;

            String mangakaName = userRepository.findById(series.getMangakaId())
                    .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                    .orElse("Unknown");

            StudioProgressDTO dto = new StudioProgressDTO();
            dto.setSeriesId(series.getId());
            dto.setSeriesTitle(series.getTitle());
            dto.setGenre(series.getGenre());
            dto.setMangakaId(series.getMangakaId());
            dto.setMangakaName(mangakaName);
            dto.setCurrentChapter(latestChapter.getChapterNumber());
            dto.setTotalPages(total);
            dto.setCompletedPages(completed);
            dto.setInProgressPages(inProgress);
            dto.setPendingPages(pending);
            dto.setOverdueTasks(overdue);
            dto.setDaysUntilDeadline(daysLeft);
            dto.setUrgent(daysLeft <= 3 || overdue > 0);
            dto.setCompletionPercent(Math.round(percent * 10.0) / 10.0);
            dto.setAssistantNames(assistantNames);
            dto.setDeadlineDate(latestChapter.getDeadline() != null ? latestChapter.getDeadline().toString() : null);
            dto.setPublishSchedule(series.getPublishSchedule() != null ? series.getPublishSchedule().name() : null);
            dto.setPublishedChapters(publishedChapters);
            dto.setApprovedChapters(approvedChapters);
            dto.setChapters(chapterSummaries);
            result.add(dto);
        }

        return result;
    }

    // ── Publish stats cho Editor Dashboard ──────────────────────────
    public java.util.Map<String, Object> getPublishStats(String editorId) {
        List<Series> mySeries = seriesRepository.findByEditorId(editorId);

        int totalPublished = 0, onTimeCount = 0, lateCount = 0;
        long totalDaysLate = 0;

        List<java.util.Map<String, Object>> bySeries = new java.util.ArrayList<>();

        for (Series series : mySeries) {
            List<Chapter> chapters = chapterRepository.findBySeries_IdOrderByChapterNumberAsc(series.getId())
                    .stream().filter(c -> c.getStatus() == Chapter.ChapterStatus.published).collect(Collectors.toList());

            int seriesTotal = chapters.size();
            int seriesOnTime = 0, seriesLate = 0;
            for (Chapter c : chapters) {
                if (c.getDeadline() != null && c.getPublishedAt() != null) {
                    if (!c.getPublishedAt().isAfter(c.getDeadline())) {
                        onTimeCount++; seriesOnTime++;
                    } else {
                        long daysLate = java.time.temporal.ChronoUnit.DAYS.between(c.getDeadline(), c.getPublishedAt());
                        lateCount++; seriesLate++;
                        totalDaysLate += daysLate;
                    }
                } else {
                    onTimeCount++; seriesOnTime++; // không có deadline → coi là đúng hạn
                }
            }
            totalPublished += seriesTotal;

            if (seriesTotal > 0) {
                java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
                row.put("seriesId", series.getId());
                row.put("seriesTitle", series.getTitle());
                row.put("totalPublished", seriesTotal);
                row.put("onTimeRate", seriesTotal > 0 ? (int) Math.round((double) seriesOnTime / seriesTotal * 100) : 0);
                bySeries.add(row);
            }
        }

        java.util.Map<String, Object> overall = new java.util.LinkedHashMap<>();
        overall.put("totalPublished", totalPublished);
        overall.put("onTimeCount", onTimeCount);
        overall.put("lateCount", lateCount);
        overall.put("onTimeRate", totalPublished > 0 ? (int) Math.round((double) onTimeCount / totalPublished * 100) : 0);
        overall.put("avgDaysLate", lateCount > 0 ? Math.round((double) totalDaysLate / lateCount) : 0);

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("overall", overall);
        result.put("bySeries", bySeries);
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
                                        a.getCreatedAt() != null ? a.getCreatedAt().toString() : null,
                                        userRepository.findById(a.getEditorId())
                                                .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                                                .orElse(null)
                                ))
                                .collect(Collectors.toList());

                        ManuscriptDTO dto = new ManuscriptDTO();
                        dto.setId(m.getId());
                        dto.setSeriesId(m.getSeriesId());
                        dto.setSeriesTitle(series.getTitle());
                        dto.setSeriesStatus(series.getStatus().name());
                        dto.setSubmittedBy(m.getSubmittedBy());
                        dto.setVersion(m.getVersion());
                        dto.setFileUrl(m.getFileUrl());
                        dto.setDescription(m.getDescription());
                        dto.setStatus(m.getStatus().name());
                        dto.setRejectionReason(m.getRejectionReason());
                        dto.setSubmittedAt(m.getSubmittedAt() != null ? m.getSubmittedAt().toString() : null);
                        dto.setCreatedAt(m.getCreatedAt() != null ? m.getCreatedAt().toString() : null);
                        dto.setAnnotations(annotations);
                        dto.setPages(manuscriptPageRepository.findByManuscriptIdOrderByPageNumberAsc(m.getId()).stream().map(p -> new ManuscriptPageDTO(p.getId(), p.getManuscriptId(), p.getPageNumber(), p.getImageUrl(), p.getThumbnailUrl(), p.getNotes())).collect(java.util.stream.Collectors.toList()));
                        dto.setCoverUrl(series.getCoverUrl());
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
                        a.getCreatedAt() != null ? a.getCreatedAt().toString() : null,
                        userRepository.findById(a.getEditorId())
                                .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                                .orElse(null)
                ))
                .collect(Collectors.toList());

        ManuscriptDTO dto2 = new ManuscriptDTO();
        dto2.setId(manuscript.getId());
        dto2.setSeriesId(manuscript.getSeriesId());
        dto2.setSeriesTitle(seriesTitle);
        dto2.setSeriesStatus(series != null ? series.getStatus().name() : null);
        dto2.setSubmittedBy(manuscript.getSubmittedBy());
        dto2.setVersion(manuscript.getVersion());
        dto2.setFileUrl(manuscript.getFileUrl());
        dto2.setDescription(manuscript.getDescription());
        dto2.setStatus(manuscript.getStatus().name());
        dto2.setRejectionReason(manuscript.getRejectionReason());
        dto2.setSubmittedAt(manuscript.getSubmittedAt() != null ? manuscript.getSubmittedAt().toString() : null);
        dto2.setCreatedAt(manuscript.getCreatedAt() != null ? manuscript.getCreatedAt().toString() : null);
        dto2.setAnnotations(annotations);
        dto2.setPages(manuscriptPageRepository.findByManuscriptIdOrderByPageNumberAsc(manuscript.getId()).stream().map(p -> new ManuscriptPageDTO(p.getId(), p.getManuscriptId(), p.getPageNumber(), p.getImageUrl(), p.getThumbnailUrl(), p.getNotes())).collect(java.util.stream.Collectors.toList()));
        dto2.setCoverUrl(series != null ? series.getCoverUrl() : null);
        return dto2;
    }

    // ── Editor nộp lên Board ──────────────────────────────────────
    @org.springframework.transaction.annotation.Transactional
    public void deleteAnnotation(String annotationId, String editorId) {
        annotationRepository.deleteByIdAndEditorId(annotationId, editorId);
        log.info("Annotation {} deleted by editor {}", annotationId, editorId);
    }

    public SubmissionDTO submitToBoard(String manuscriptId, String editorId, SubmitToBoardRequest request) {
        Manuscript manuscript = manuscriptRepository.findById(manuscriptId)
                .orElseThrow(() -> new RuntimeException("Manuscript not found"));

        Series series = seriesRepository.findById(manuscript.getSeriesId())
                .orElseThrow(() -> new RuntimeException("Series not found"));

        // Kiểm tra editor có phụ trách series này không
        if (!editorId.equals(series.getEditorId())) {
            throw new RuntimeException("Bạn không phụ trách series này");
        }

        // Không append vào description — evaluation đã lưu trực tiếp vào Submission fields
        manuscript.setStatus(Manuscript.ManuscriptStatus.approved);
        manuscript.setReviewedAt(LocalDateTime.now());
        manuscriptRepository.save(manuscript);

        // Tạo Submission lên Board
        int submissionRound = submissionRepository.countBySeriesId(manuscript.getSeriesId()) + 1;

        Submission submission = new Submission();
        submission.setManuscriptId(manuscriptId);
        submission.setSubmittedBy(editorId);
        submission.setSubmissionRound(submissionRound);
        submission.setCoverLetter(request.getEditorNote());
        submission.setStatus(Submission.SubmissionStatus.voting); // Editor nộp = bắt đầu vòng vote
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

        // Resolve editor name cho DTO
        String editorName = userRepository.findById(series.getEditorId() != null ? series.getEditorId() : "")
                .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                .orElse(null);

        SubmissionDTO submissionDto = new SubmissionDTO();
        submissionDto.setId(submission.getId());
        submissionDto.setManuscriptId(manuscriptId);
        submissionDto.setSeriesId(series.getId());
        submissionDto.setSeriesTitle(series.getTitle());
        submissionDto.setSubmittedBy(submission.getSubmittedBy());
        submissionDto.setSubmissionRound(submission.getSubmissionRound());
        submissionDto.setCoverLetter(submission.getCoverLetter());
        submissionDto.setStatus(submission.getStatus().name());
        submissionDto.setVoteYes(0);
        submissionDto.setVoteNo(0);
        submissionDto.setVoteAbstain(0);
        submissionDto.setVotingDeadline(submission.getVotingDeadline() != null ? submission.getVotingDeadline().toString() : null);
        submissionDto.setCreatedAt(submission.getCreatedAt() != null ? submission.getCreatedAt().toString() : null);
        submissionDto.setAssignedEditorName(editorName);
        submissionDto.setCoverUrl(series.getCoverUrl());
        return submissionDto;
    }

    // ── Editor trả lại Mangaka để sửa ────────────────────────────
    @org.springframework.transaction.annotation.Transactional
    /**
     * Reset manuscript về under_review — Editor đã đánh dấu "Sẵn sàng" nhưng muốn xem lại
     * Chỉ cho phép reset khi manuscript đang ở status approved (sẵn sàng nộp board)
     */
    public ManuscriptDTO resetManuscriptToUnderReview(String manuscriptId, String editorId) {
        Manuscript manuscript = manuscriptRepository.findById(manuscriptId)
                .orElseThrow(() -> new RuntimeException("Manuscript not found"));

        Series series = seriesRepository.findById(manuscript.getSeriesId())
                .orElseThrow(() -> new RuntimeException("Series not found"));

        // Chỉ Editor phụ trách series này mới được reset
        if (!series.getEditorId().equals(editorId)) {
            throw new RuntimeException("Bạn không có quyền thao tác với bản thảo này");
        }

        // Chỉ reset được khi đang approved (Sẵn sàng) — không reset khi đã nộp Board
        if (manuscript.getStatus() != Manuscript.ManuscriptStatus.approved) {
            throw new RuntimeException(
                    "Chỉ có thể reset bản thảo đang ở trạng thái 'Sẵn sàng'. " +
                            "Hiện tại: " + manuscript.getStatus().name()
            );
        }

        manuscript.setStatus(Manuscript.ManuscriptStatus.under_review);
        manuscriptRepository.save(manuscript);

        // Series cũng cần về under_editorial_review (Editor đang xét lại, chưa nộp Board)
        series.setStatus(Series.SeriesStatus.under_editorial_review);
        seriesRepository.save(series);

        log.info("Manuscript {} reset to under_review by editor {}", manuscriptId, editorId);

        // Build response
        String seriesTitle = series.getTitle();
        List<AnnotationDTO> annotations = annotationRepository
                .findByManuscriptIdOrderByCreatedAtAsc(manuscriptId).stream()
                .map(a -> new AnnotationDTO(
                        a.getId(), a.getNote(), a.getTag(),
                        a.getX(), a.getY(), a.getPageNumber(),
                        a.getCreatedAt() != null ? a.getCreatedAt().toString() : null,
                        userRepository.findById(a.getEditorId())
                                .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                                .orElse(null)
                ))
                .collect(java.util.stream.Collectors.toList());

        ManuscriptDTO dto3 = new ManuscriptDTO();
        dto3.setId(manuscript.getId());
        dto3.setSeriesId(manuscript.getSeriesId());
        dto3.setSeriesTitle(seriesTitle);
        dto3.setSeriesStatus(series.getStatus().name());
        dto3.setSubmittedBy(manuscript.getSubmittedBy());
        dto3.setVersion(manuscript.getVersion());
        dto3.setFileUrl(manuscript.getFileUrl());
        dto3.setDescription(manuscript.getDescription());
        dto3.setStatus(manuscript.getStatus().name());
        dto3.setRejectionReason(manuscript.getRejectionReason());
        dto3.setSubmittedAt(manuscript.getSubmittedAt() != null ? manuscript.getSubmittedAt().toString() : null);
        dto3.setCreatedAt(manuscript.getCreatedAt() != null ? manuscript.getCreatedAt().toString() : null);
        dto3.setAnnotations(annotations);
        dto3.setPages(manuscriptPageRepository.findByManuscriptIdOrderByPageNumberAsc(manuscript.getId()).stream().map(p -> new ManuscriptPageDTO(p.getId(), p.getManuscriptId(), p.getPageNumber(), p.getImageUrl(), p.getThumbnailUrl(), p.getNotes())).collect(java.util.stream.Collectors.toList()));
        dto3.setCoverUrl(series.getCoverUrl());
        return dto3;
    }

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

        ManuscriptDTO dto4 = new ManuscriptDTO();
        dto4.setId(manuscript.getId());
        dto4.setSeriesId(manuscript.getSeriesId());
        dto4.setSeriesTitle(series.getTitle());
        dto4.setSeriesStatus(series.getStatus().name());
        dto4.setSubmittedBy(manuscript.getSubmittedBy());
        dto4.setVersion(manuscript.getVersion());
        dto4.setFileUrl(manuscript.getFileUrl());
        dto4.setDescription(manuscript.getDescription());
        dto4.setStatus(manuscript.getStatus().name());
        dto4.setRejectionReason(manuscript.getRejectionReason());
        dto4.setSubmittedAt(manuscript.getSubmittedAt() != null ? manuscript.getSubmittedAt().toString() : null);
        dto4.setCreatedAt(manuscript.getCreatedAt() != null ? manuscript.getCreatedAt().toString() : null);
        dto4.setCoverUrl(series.getCoverUrl());
        return dto4;
    }}