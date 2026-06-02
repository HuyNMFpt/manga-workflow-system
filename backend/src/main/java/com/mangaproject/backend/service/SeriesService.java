package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.Series;
import com.mangaproject.backend.repository.SeriesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeriesService {

    private final SeriesRepository seriesRepository;

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

        series = seriesRepository.save(series);
        return mapToDTO(series);
    }

    public List<SeriesDTO> getAllSeries() {
        return seriesRepository.findAll().stream()
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