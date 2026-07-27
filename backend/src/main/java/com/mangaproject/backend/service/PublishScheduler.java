package com.mangaproject.backend.service;

import com.mangaproject.backend.model.Chapter;
import com.mangaproject.backend.model.Notification;
import com.mangaproject.backend.model.Series;
import com.mangaproject.backend.repository.ChapterRepository;
import com.mangaproject.backend.repository.NotificationRepository;
import com.mangaproject.backend.repository.SeriesRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PublishScheduler {

    private final SeriesRepository seriesRepository;
    private final ChapterRepository chapterRepository;
    private final NotificationRepository notificationRepository;
    private final LookupResolverService lookupResolverService;

    /**
     * TODO 3: Scheduled auto-publish
     * Chạy mỗi ngày lúc 8 giờ sáng
     * Tự động xuất bản chapter approved theo lịch của series (weekly/biweekly/monthly)
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void autoPublishChapters() {
        LocalDate today = LocalDate.now();

        List<Series> publishingSeries = seriesRepository.findByStatusIn(
                List.of(Series.SeriesStatus.publishing));

        for (Series series : publishingSeries) {
            if (series.getPublishSchedule() == null || series.getPublishStartDate() == null) continue;

            // Kiểm tra hôm nay có phải ngày xuất bản theo lịch không
            if (!isPublishDay(series, today)) continue;

            // Tìm chapter approved nhỏ nhất (chưa published)
            List<Chapter> approvedChapters = chapterRepository
                    .findBySeries_IdOrderByChapterNumberAsc(series.getId())
                    .stream()
                    .filter(c -> c.getStatus() == Chapter.ChapterStatus.approved)
                    .toList();

            if (approvedChapters.isEmpty()) {
                log.info("PublishScheduler: No approved chapters for series {}", series.getTitle());
                continue;
            }

            Chapter chapter = approvedChapters.get(0);
            chapter.setStatus(Chapter.ChapterStatus.published);
            chapter.setPublishedAt(today);
            chapterRepository.save(chapter);

            // Notification cho Mangaka
            Notification notif = new Notification();
            notif.setUserId(series.getMangakaId());
            notif.setType(Notification.NotificationType.chapter_published);
            notif.setNotificationTypeId(
                    lookupResolverService.resolveNotificationTypeId(Notification.NotificationType.chapter_published));
            notif.setReferenceId(chapter.getId());
            notif.setReferenceType("chapter");
            notif.setMessage("Chapter " + chapter.getChapterNumber()
                    + " của \"" + series.getTitle() + "\" đã được tự động xuất bản theo lịch!");
            notificationRepository.save(notif);

            log.info("PublishScheduler: Auto-published chapter {} for series {}",
                    chapter.getChapterNumber(), series.getTitle());
        }
    }

    /**
     * Kiểm tra hôm nay có phải ngày xuất bản theo lịch không
     * Tính từ publishStartDate + bội số của chu kỳ
     */
    private boolean isPublishDay(Series series, LocalDate today) {
        LocalDate startDate = series.getPublishStartDate();
        if (startDate == null || today.isBefore(startDate)) return false;

        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(startDate, today);

        return switch (series.getPublishSchedule()) {
            case weekly    -> daysBetween % 7 == 0;
            case biweekly  -> daysBetween % 14 == 0;
            case monthly   -> today.getDayOfMonth() == startDate.getDayOfMonth()
                    && daysBetween >= 28;
            default        -> false;
        };
    }
}