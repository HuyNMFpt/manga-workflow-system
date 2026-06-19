package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.Notification;
import com.mangaproject.backend.model.Series;
import com.mangaproject.backend.repository.NotificationRepository;
import com.mangaproject.backend.repository.SeriesRepository;
import com.mangaproject.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeriesService {

    private final SeriesRepository seriesRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    public SeriesDTO createSeries(CreateSeriesRequest request, String mangakaId) {
        Series series = new Series();
        series.setTitle(request.getTitle());
        series.setSlug(generateSlug(request.getTitle()));
        series.setGenre(request.getGenre());
        series.setSynopsis(request.getSynopsis());
        series.setCoverUrl(request.getCoverUrl());
        series.setMangakaId(mangakaId);
        series.setStatus(Series.SeriesStatus.draft);

        if (request.getSchedule() != null) {
            series.setPublishSchedule(Series.PublishSchedule.valueOf(request.getSchedule()));
        }

        if (request.getEditorId() != null) {
            series.setEditorId(request.getEditorId());
        }

        series = seriesRepository.save(series);
        return mapToDTO(series);
    }

    public List<SeriesDTO> getAllSeries(String status) {
        List<Series> result = (status != null && !status.isEmpty())
                ? seriesRepository.findByStatus(Series.SeriesStatus.valueOf(status))
                : seriesRepository.findAll();
        return result.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public PaginatedResponse<SeriesDTO> getSeriesByMangaka(String mangakaId) {
        List<SeriesDTO> series = seriesRepository.findByMangakaId(mangakaId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        return new PaginatedResponse<>(
                series,
                series.size(),
                1,
                series.size(),
                1
        );
    }

    public SeriesDTO getById(String id) {
        Series series = seriesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Series not found"));
        return mapToDTO(series);
    }

    public SeriesDTO updateStatus(String id, String status) {
        Series series = seriesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Series not found"));
        series.setStatus(Series.SeriesStatus.valueOf(status));
        series = seriesRepository.save(series);
        return mapToDTO(series);
    }

    @Transactional
    public SeriesDTO updateSeries(String id, String title, String genre, String synopsis,
                                   String coverUrl, String editorId, String mangakaId) {
        Series series = seriesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Series not found"));

        if (!series.getMangakaId().equals(mangakaId)) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa series này");
        }

        if (title != null) series.setTitle(title);
        if (genre != null) series.setGenre(genre);
        if (synopsis != null) series.setSynopsis(synopsis);
        if (coverUrl != null) series.setCoverUrl(coverUrl);
        if (editorId != null) series.setEditorId(editorId);

        series = seriesRepository.save(series);
        return mapToDTO(series);
    }

    @Transactional
    public void deleteSeries(String id, String mangakaId) {
        Series series = seriesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Series not found"));

        log.debug("Delete series: id={}, status={}, series.mangakaId={}, caller.mangakaId={}",
                id, series.getStatus(), series.getMangakaId(), mangakaId);

        if (series.getMangakaId() == null || !series.getMangakaId().equals(mangakaId)) {
            throw new RuntimeException("Bạn không có quyền xóa series này");
        }

        if (series.getStatus() != Series.SeriesStatus.draft
                && series.getStatus() != Series.SeriesStatus.cancelled) {
            throw new RuntimeException("Chỉ có thể xóa series ở trạng thái draft hoặc cancelled");
        }

        seriesRepository.delete(series);
        log.info("Series deleted: id={}, by mangaka={}", id, mangakaId);
    }

    @Transactional
    public void sendMessageToEditor(String id, SeriesMessageRequest request, String mangakaId) {
        Series series = seriesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Series not found"));

        if (!series.getMangakaId().equals(mangakaId)) {
            throw new RuntimeException("Bạn không có quyền gửi message cho series này");
        }

        // Nếu có requestedStatus = "cancelled" → tự update status
        if ("cancelled".equals(request.getRequestedStatus())) {
            series.setStatus(Series.SeriesStatus.cancelled);
            seriesRepository.save(series);
        } else if ("draft".equals(request.getRequestedStatus())) {
            // Chuyển về draft để chỉnh sửa (chỉ từ submitted)
            if (series.getStatus() == Series.SeriesStatus.submitted) {
                series.setStatus(Series.SeriesStatus.draft);
                seriesRepository.save(series);
            }
        }

        // Gửi notification cho editor phụ trách (nếu có)
        if (series.getEditorId() != null) {
            String mangakaName = userRepository.findById(mangakaId)
                    .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                    .orElse("Mangaka");

            Notification notification = new Notification();
            notification.setUserId(series.getEditorId());
            notification.setType(Notification.NotificationType.series_at_risk);
            notification.setReferenceId(series.getId());
            notification.setReferenceType("series");
            notification.setMessage(String.format(
                    "[%s] %s: %s",
                    series.getTitle(),
                    mangakaName,
                    request.getReason() != null ? request.getReason() : "Gửi yêu cầu"
            ));
            notificationRepository.save(notification);
        }

        log.info("Message sent to editor: seriesId={}, from mangaka={}, requestedStatus={}",
                id, mangakaId, request.getRequestedStatus());
    }

    private String generateSlug(String title) {
        return title.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                + "-" + System.currentTimeMillis();
    }

    private SeriesDTO mapToDTO(Series series) {
        return new SeriesDTO(
                series.getId(),
                series.getTitle(),
                series.getGenre(),
                series.getSynopsis(),
                series.getCoverUrl(),
                series.getMangakaId(),
                series.getEditorId(),
                series.getStatus().name(),
                series.getPublishSchedule() != null ? series.getPublishSchedule().name() : null,
                series.getCreatedAt().toString(),
                series.getUpdatedAt() != null ? series.getUpdatedAt().toString() : null
        );
    }
}