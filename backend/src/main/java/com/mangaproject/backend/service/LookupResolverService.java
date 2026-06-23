package com.mangaproject.backend.service;

import com.mangaproject.backend.model.Notification;
import com.mangaproject.backend.model.Series;
import com.mangaproject.backend.repository.NotificationTypeLookupRepository;
import com.mangaproject.backend.repository.PublishScheduleLookupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Resolve các cột FK *_id (notification_type_id, publish_schedule_id, ...)
 * tương ứng với enum value, vì DB đã tách enum thành bảng lookup riêng.
 *
 * Cùng pattern với PriorityLookup/TaskTypeLookup (xem TaskService) — entity vẫn
 * giữ cột enum string để đọc/ghi tiện lợi, nhưng phải set thêm cột *_id song song
 * để không vi phạm FK constraint khi insert.
 */
@Service
@RequiredArgsConstructor
public class LookupResolverService {

    private final NotificationTypeLookupRepository notificationTypeLookupRepository;
    private final PublishScheduleLookupRepository publishScheduleLookupRepository;

    public String resolveNotificationTypeId(Notification.NotificationType type) {
        if (type == null) return null;
        return notificationTypeLookupRepository.findByName(type.name())
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy notification_type trong bảng lookup: " + type.name()))
                .getId();
    }

    public String resolvePublishScheduleId(Series.PublishSchedule schedule) {
        if (schedule == null) return null;
        return publishScheduleLookupRepository.findByName(schedule.name())
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy publish_schedule trong bảng lookup: " + schedule.name()))
                .getId();
    }
}
