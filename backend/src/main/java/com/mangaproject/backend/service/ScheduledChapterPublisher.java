package com.mangaproject.backend.service;

import com.mangaproject.backend.model.Chapter;
import com.mangaproject.backend.model.Notification;
import com.mangaproject.backend.model.Series;
import com.mangaproject.backend.repository.ChapterRepository;
import com.mangaproject.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledChapterPublisher {

    private final ChapterRepository chapterRepository;
    private final NotificationRepository notificationRepository;
    private final LookupResolverService lookupResolverService;

    /**
     * Chạy mỗi phút — publish chapter đã đến giờ đặt lịch
     */
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void publishDueChapters() {
        LocalDateTime now = LocalDateTime.now();
        List<Chapter> due = chapterRepository
                .findByStatusAndScheduledPublishAtBefore(Chapter.ChapterStatus.scheduled, now);

        if (due.isEmpty()) return;

        for (Chapter chapter : due) {
            chapter.setStatus(Chapter.ChapterStatus.published);
            chapter.setPublishedAt(now.toLocalDate());
            chapterRepository.save(chapter);

            Series series = chapter.getSeries();
            Notification notif = new Notification();
            notif.setUserId(series.getMangakaId());
            notif.setType(Notification.NotificationType.chapter_published);
            notif.setNotificationTypeId(lookupResolverService
                    .resolveNotificationTypeId(Notification.NotificationType.chapter_published));
            notif.setReferenceId(chapter.getId());
            notif.setReferenceType("chapter");
            notif.setMessage("Chapter " + chapter.getChapterNumber() + " của \""
                    + series.getTitle() + "\" đã được tự động xuất bản đúng lịch!");
            notificationRepository.save(notif);

            log.info("ScheduledChapterPublisher: published chapter {} ({})",
                    chapter.getChapterNumber(), chapter.getId());
        }
    }
}