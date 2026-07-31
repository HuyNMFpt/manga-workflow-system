package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.ChapterDTO;
import com.mangaproject.backend.dto.CreateChapterRequest;
import com.mangaproject.backend.dto.PageDTO;
import com.mangaproject.backend.model.Chapter;
import com.mangaproject.backend.model.Notification;
import com.mangaproject.backend.model.Page;
import com.mangaproject.backend.model.Series;
import com.mangaproject.backend.model.Task;
import com.mangaproject.backend.repository.ChapterRepository;
import com.mangaproject.backend.repository.SeriesRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChapterService {

    private final ChapterRepository chapterRepository;
    private final SeriesRepository seriesRepository;
    private final com.mangaproject.backend.repository.NotificationRepository notificationRepository;
    private final LookupResolverService lookupResolverService;
    private final com.mangaproject.backend.repository.PageRepository pageRepository;
    private final com.mangaproject.backend.repository.TaskRepository taskRepository;

    @Transactional(readOnly = true)
    public List<ChapterDTO> getChaptersBySeries(String seriesId) {
        List<Chapter> chapters = chapterRepository.findBySeries_IdOrderByChapterNumberAsc(seriesId);
        return chapters.stream()
                .map(this::mapToDTOWithPages)  // include pages[] để frontend map task → chapter
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ChapterDTO getChapterById(String id) {
        Chapter chapter = chapterRepository.findByIdWithPages(id)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));
        return mapToDTOWithPages(chapter);
    }

    @Transactional
    public ChapterDTO createChapter(CreateChapterRequest request, String currentUserId) {
        Series series = seriesRepository.findById(request.getSeriesId())
                .orElseThrow(() -> new RuntimeException("Series not found"));

        if (chapterRepository.existsBySeries_IdAndChapterNumber(
                request.getSeriesId(), request.getChapterNumber())) {
            throw new RuntimeException("Chapter number already exists for this series");
        }

        Chapter chapter = new Chapter();
        chapter.setSeries(series);
        chapter.setChapterNumber(request.getChapterNumber());
        chapter.setTitle(request.getTitle());
        chapter.setNotes(request.getNotes());
        chapter.setStatus(Chapter.ChapterStatus.in_progress);

        // Tự tính deadline dựa vào publishStartDate + publishSchedule của series
        if (series.getPublishStartDate() != null && series.getPublishSchedule() != null) {
            int daysPerChapter = switch (series.getPublishSchedule()) {
                case weekly   -> 7;
                case biweekly -> 14;
                case monthly  -> 30;
            };
            java.time.LocalDate deadline = series.getPublishStartDate()
                    .plusDays((long)(request.getChapterNumber() - 1) * daysPerChapter);
            chapter.setDeadline(deadline);
            log.info("Auto deadline set for chapter {}: {}", request.getChapterNumber(), deadline);
        }

        chapter = chapterRepository.save(chapter);
        return mapToDTO(chapter);
    }

    @Transactional
    public ChapterDTO updateChapter(String id, CreateChapterRequest request) {
        Chapter chapter = chapterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));

        if (!chapter.getChapterNumber().equals(request.getChapterNumber())) {
            if (chapterRepository.existsBySeries_IdAndChapterNumber(
                    chapter.getSeries().getId(), request.getChapterNumber())) {
                throw new RuntimeException("Chapter number already exists for this series");
            }
            chapter.setChapterNumber(request.getChapterNumber());
        }

        chapter.setTitle(request.getTitle());
        chapter.setNotes(request.getNotes());

        chapter = chapterRepository.save(chapter);
        return mapToDTO(chapter);
    }

    @Transactional
    public void deleteChapter(String id) {
        Chapter chapter = chapterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));

        if (chapter.getStatus() == Chapter.ChapterStatus.published) {
            throw new RuntimeException("Cannot delete published chapter");
        }

        // Cascade: xóa tasks → pages → chapter
        List<Page> pages = pageRepository.findByChapterId(id);
        for (Page p : pages) {
            taskRepository.deleteByPageId(p.getId());
        }
        pageRepository.deleteByChapterId(id);

        chapterRepository.delete(chapter);
        log.info("Chapter deleted with cascade: id={}", id);
    }

    @Transactional
    public ChapterDTO updateChapterStatus(String id, String status, String currentEditorId) {
        Chapter chapter = chapterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));

        Chapter.ChapterStatus newStatus;
        try {
            newStatus = Chapter.ChapterStatus.valueOf(status.toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status: " + status);
        }

        chapter.setStatus(newStatus);

        // ── PRE-PUBLISH VALIDATION (TODO 1) ──────────────────────────
        if (newStatus == Chapter.ChapterStatus.published) {
            // 1. Series phải đang publishing
            Series series = chapter.getSeries();
            if (series.getStatus() != Series.SeriesStatus.publishing) {
                throw new RuntimeException(
                        "Series \"" + series.getTitle() + "\" chưa được duyệt xuất bản (status: "
                                + series.getStatus().name() + ")");
            }
            // 2. Chapter phải ở trạng thái approved
            if (chapter.getStatus() != Chapter.ChapterStatus.published
                    && chapter.getStatus() == Chapter.ChapterStatus.in_progress) {
                throw new RuntimeException(
                        "Chapter chưa hoàn thành sản xuất — cần approved trước khi xuất bản");
            }
            // 3. Set publishedAt
            if (chapter.getPublishedAt() == null) {
                chapter.setPublishedAt(LocalDate.now());
            }
            // 4. Notification cho Mangaka
            Notification notif = new Notification();
            notif.setUserId(series.getMangakaId());
            notif.setType(Notification.NotificationType.chapter_published);
            notif.setNotificationTypeId(
                    lookupResolverService.resolveNotificationTypeId(Notification.NotificationType.chapter_published));
            notif.setReferenceId(chapter.getId());
            notif.setReferenceType("chapter");
            notif.setMessage("Chapter " + chapter.getChapterNumber()
                    + " của \"" + series.getTitle() + "\" đã được xuất bản!");
            notificationRepository.save(notif);
        } else if (newStatus == Chapter.ChapterStatus.published && chapter.getPublishedAt() == null) {
            chapter.setPublishedAt(LocalDate.now());
        }

        chapter = chapterRepository.save(chapter);
        return mapToDTO(chapter);
    }

    // ── Pre-publish readiness check (response khớp frontend) ──────
    public java.util.Map<String, Object> checkReadiness(String chapterId) {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));

        java.util.List<Page> pages = pageRepository.findByChapter_IdOrderByPageNumberAsc(chapterId);
        int totalPages = pages.size();

        // Trang thiếu ảnh
        java.util.List<Integer> missingImagePages = pages.stream()
                .filter(p -> p.getImageUrl() == null || p.getImageUrl().isBlank())
                .map(Page::getPageNumber)
                .collect(java.util.stream.Collectors.toList());

        // Task chưa hoàn thành trên tất cả pages
        long activeTaskCount = pages.stream()
                .flatMap(p -> taskRepository.findByPageId(p.getId()).stream())
                .filter((Task t) -> t.getStatus() != Task.TaskStatus.approved)
                .count();

        // Sequence warning: chapter liền trước (chapterNumber - 1, cùng series)
        // chưa published → cảnh báo độc giả có thể bị nhảy cóc số chapter
        boolean sequenceWarning = false;
        Integer chapterNumber = chapter.getChapterNumber();
        if (chapterNumber != null && chapterNumber > 1) {
            Chapter prevChapter = chapterRepository
                    .findBySeries_IdAndChapterNumber(chapter.getSeries().getId(), chapterNumber - 1)
                    .orElse(null);
            sequenceWarning = prevChapter != null
                    && prevChapter.getStatus() != Chapter.ChapterStatus.published;
        }

        boolean hasPages      = totalPages > 0;
        boolean minPagesOk    = totalPages >= 1;
        boolean allImagesOk   = missingImagePages.isEmpty();
        boolean noActiveTasksOk = activeTaskCount == 0;

        java.util.Map<String, Object> r = new java.util.LinkedHashMap<>();
        r.put("ready",           hasPages && minPagesOk && allImagesOk && noActiveTasksOk);
        r.put("hasPages",        hasPages);
        r.put("minPagesOk",      minPagesOk);
        r.put("allImagesOk",     allImagesOk);
        r.put("noActiveTasksOk", noActiveTasksOk);
        r.put("totalPages",      totalPages);
        r.put("missingImagePages", missingImagePages);
        r.put("activeTaskCount", activeTaskCount);
        r.put("sequenceWarning", sequenceWarning);
        return r;
    }

    // ── Auto-approve chapter khi đủ điều kiện (dùng chung với checkReadiness) ─
    @Transactional
    public void refreshStatusIfReady(String chapterId) {
        try {
            Chapter chapter = chapterRepository.findById(chapterId).orElse(null);
            if (chapter == null) return;
            // Không downgrade nếu đã approved/published/scheduled
            if (chapter.getStatus() == Chapter.ChapterStatus.approved
                    || chapter.getStatus() == Chapter.ChapterStatus.published
                    || chapter.getStatus() == Chapter.ChapterStatus.scheduled) return;

            java.util.Map<String, Object> readiness = checkReadiness(chapterId);
            boolean ready = Boolean.TRUE.equals(readiness.get("ready"));
            if (ready) {
                chapter.setStatus(Chapter.ChapterStatus.approved);
                chapterRepository.save(chapter);
                log.info("Chapter {} auto-approved (refreshStatusIfReady)", chapterId);
            }
        } catch (Exception e) {
            log.warn("refreshStatusIfReady failed for chapterId={}: {}", chapterId, e.getMessage());
        }
    }


    // ── Schedule publish — publishAt=null → phát hành ngay, có giá trị → đặt lịch ──
    public ChapterDTO schedulePublish(String chapterId, String publishAt) {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));

        if (publishAt == null || publishAt.isBlank()) {
            // Phát hành ngay
            chapter.setStatus(Chapter.ChapterStatus.published);
            chapter.setPublishedAt(java.time.LocalDate.now());
            chapter.setScheduledPublishAt(null);
        } else {
            // Đặt lịch — giữ NGUYÊN giờ phút, không cắt chuỗi
            try {
                java.time.LocalDateTime scheduledAt = java.time.LocalDateTime.parse(publishAt);
                chapter.setStatus(Chapter.ChapterStatus.scheduled);
                chapter.setScheduledPublishAt(scheduledAt);
            } catch (Exception e) {
                throw new RuntimeException("publishAt không đúng định dạng ISO datetime (vd: 2026-08-24T09:00:00)");
            }
        }

        chapter = chapterRepository.save(chapter);

        // Notification chỉ khi publish ngay
        if (chapter.getStatus() == Chapter.ChapterStatus.published) {
            Series series = chapter.getSeries();
            com.mangaproject.backend.model.Notification notif = new com.mangaproject.backend.model.Notification();
            notif.setUserId(series.getMangakaId());
            notif.setType(com.mangaproject.backend.model.Notification.NotificationType.chapter_published);
            notif.setNotificationTypeId(lookupResolverService.resolveNotificationTypeId(
                    com.mangaproject.backend.model.Notification.NotificationType.chapter_published));
            notif.setReferenceId(chapter.getId());
            notif.setReferenceType("chapter");
            notif.setMessage("Chapter " + chapter.getChapterNumber() + " của \"" + series.getTitle() + "\" đã được xuất bản!");
            notificationRepository.save(notif);
        }

        return mapToDTO(chapter);
    }

    private ChapterDTO mapToDTO(Chapter chapter) {
        ChapterDTO dto = new ChapterDTO();
        dto.setId(chapter.getId());
        dto.setSeriesId(chapter.getSeries().getId());
        dto.setSeriesTitle(chapter.getSeries().getTitle());
        dto.setChapterNumber(chapter.getChapterNumber());
        dto.setTitle(chapter.getTitle());
        dto.setNotes(chapter.getNotes());
        dto.setStatus(chapter.getStatus().name());
        dto.setDeadline(chapter.getDeadline() != null ? chapter.getDeadline().toString() : null);
        dto.setTotalPages(chapter.getPages() != null ? chapter.getPages().size() : 0);
        dto.setPublishedAt(chapter.getPublishedAt() != null ?
                chapter.getPublishedAt().atStartOfDay() : null);
        dto.setScheduledPublishAt(chapter.getScheduledPublishAt());
        dto.setCreatedAt(chapter.getCreatedAt());
        dto.setUpdatedAt(chapter.getUpdatedAt());
        return dto;
    }

    private ChapterDTO mapToDTOWithPages(Chapter chapter) {
        ChapterDTO dto = mapToDTO(chapter);
        if (chapter.getPages() != null) {
            List<PageDTO> pageDTOs = chapter.getPages().stream()
                    .map(page -> {
                        PageDTO pageDTO = new PageDTO();
                        pageDTO.setId(page.getId());
                        pageDTO.setChapterId(chapter.getId());
                        pageDTO.setPageNumber(page.getPageNumber());
                        pageDTO.setImageUrl(page.getImageUrl());
                        pageDTO.setThumbnailUrl(page.getThumbnailUrl());
                        pageDTO.setStatus(page.getStatus().name());
                        pageDTO.setNotes(page.getNotes());
                        pageDTO.setCreatedAt(page.getCreatedAt());
                        pageDTO.setUpdatedAt(page.getUpdatedAt());
                        return pageDTO;
                    })
                    .collect(Collectors.toList());
            dto.setPages(pageDTOs);
        }
        return dto;
    }
}