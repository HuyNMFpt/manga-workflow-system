package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.PageDTO;
import com.mangaproject.backend.model.Chapter;
import com.mangaproject.backend.model.Page;
import com.mangaproject.backend.repository.ChapterRepository;
import com.mangaproject.backend.repository.PageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PageService {

    private final PageRepository pageRepository;
    private final ChapterRepository chapterRepository;
    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public List<PageDTO> getPagesByChapter(String chapterId) {
        List<Page> pages = pageRepository.findByChapter_IdOrderByPageNumberAsc(chapterId);
        return pages.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PageDTO getPageById(String id) {
        Page page = pageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Page not found"));
        return mapToDTO(page);
    }

    @Transactional
    public PageDTO uploadPage(String chapterId, Integer pageNumber, MultipartFile file, String notes) throws IOException {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));

        if (pageRepository.existsByChapter_IdAndPageNumber(chapterId, pageNumber)) {
            throw new RuntimeException("Page number already exists in this chapter");
        }

        String folder = String.format("chapters/%s/pages", chapterId);
        String imageUrl = fileStorageService.storeFile(file, folder);
        String thumbnailUrl = fileStorageService.storeThumbnail(file, folder);

        Page page = new Page();
        page.setChapter(chapter);
        page.setPageNumber(pageNumber);
        page.setImageUrl(imageUrl);       // map → raw_file_url
        page.setThumbnailUrl(thumbnailUrl); // map → final_file_url
        page.setNotes(notes);
        page.setStatus(Page.PageStatus.in_progress); // UPLOADED → in_progress

        page = pageRepository.save(page);

        // Cập nhật total_pages của chapter
        long totalPages = pageRepository.countByChapter_Id(chapterId);
        chapter.setTotalPages((int) totalPages);
        chapterRepository.save(chapter);

        log.info("Page uploaded successfully: chapter={}, page={}", chapterId, pageNumber);
        return mapToDTO(page);
    }

    @Transactional
    public void deletePage(String id) throws IOException {
        Page page = pageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Page not found"));

        String chapterId = page.getChapter().getId();
        Chapter chapter = page.getChapter();

        try {
            fileStorageService.deleteFile(page.getImageUrl());
            fileStorageService.deleteFile(page.getThumbnailUrl());
        } catch (IOException e) {
            log.error("Failed to delete page files", e);
        }

        pageRepository.delete(page);

        // Cập nhật total_pages
        long totalPages = pageRepository.countByChapter_Id(chapterId);
        chapter.setTotalPages((int) totalPages);
        chapterRepository.save(chapter);

        log.info("Page deleted successfully: {}", id);
    }

    @Transactional
    public PageDTO updatePageOrder(String id, Integer newPageNumber) {
        Page page = pageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Page not found"));

        if (!page.getPageNumber().equals(newPageNumber)) {
            if (pageRepository.existsByChapter_IdAndPageNumber(
                    page.getChapter().getId(), newPageNumber)) {
                throw new RuntimeException("Page number already exists in this chapter");
            }
            page.setPageNumber(newPageNumber);
        }

        page = pageRepository.save(page);
        return mapToDTO(page);
    }

    @Transactional
    public PageDTO updatePageStatus(String id, String status) {
        Page page = pageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Page not found"));

        Page.PageStatus newStatus;
        try {
            newStatus = Page.PageStatus.valueOf(status.toLowerCase()); // toLowerCase thay vì toUpperCase
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status: " + status);
        }

        page.setStatus(newStatus);
        page = pageRepository.save(page);
        return mapToDTO(page);
    }

    private PageDTO mapToDTO(Page page) {
        PageDTO dto = new PageDTO();
        dto.setId(page.getId());
        dto.setChapterId(page.getChapter().getId());
        dto.setPageNumber(page.getPageNumber());
        dto.setImageUrl(page.getImageUrl());
        dto.setThumbnailUrl(page.getThumbnailUrl());
        dto.setStatus(page.getStatus().name());
        dto.setNotes(page.getNotes());
        dto.setCreatedAt(page.getCreatedAt());
        dto.setUpdatedAt(page.getUpdatedAt());
        return dto;
    }
}