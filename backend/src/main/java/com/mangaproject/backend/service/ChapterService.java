package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.ChapterDTO;
import com.mangaproject.backend.dto.CreateChapterRequest;
import com.mangaproject.backend.dto.PageDTO;
import com.mangaproject.backend.model.Chapter;
import com.mangaproject.backend.model.Series;
import com.mangaproject.backend.repository.ChapterRepository;
import com.mangaproject.backend.repository.SeriesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChapterService {

    private final ChapterRepository chapterRepository;
    private final SeriesRepository seriesRepository;

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
    public ChapterDTO createChapter(CreateChapterRequest request) {
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

        chapterRepository.delete(chapter);
    }

    @Transactional
    public ChapterDTO updateChapterStatus(String id, String status) {
        Chapter chapter = chapterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));

        Chapter.ChapterStatus newStatus;
        try {
            newStatus = Chapter.ChapterStatus.valueOf(status.toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status: " + status);
        }

        chapter.setStatus(newStatus);

        if (newStatus == Chapter.ChapterStatus.published && chapter.getPublishedAt() == null) {
            chapter.setPublishedAt(LocalDate.now());
        }

        chapter = chapterRepository.save(chapter);
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
        dto.setTotalPages(chapter.getPages() != null ? chapter.getPages().size() : 0);
        dto.setPublishedAt(chapter.getPublishedAt() != null ?
                chapter.getPublishedAt().atStartOfDay() : null);
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