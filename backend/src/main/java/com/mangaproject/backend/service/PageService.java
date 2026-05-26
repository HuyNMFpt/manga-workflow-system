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
        List<Page> pages = pageRepository.findByChapterIdOrderByPageNumberAsc(chapterId);
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
        // Validate chapter exists
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));

        // Check if page number already exists
        if (pageRepository.existsByChapterIdAndPageNumber(chapterId, pageNumber)) {
            throw new RuntimeException("Page number already exists in this chapter");
        }

        // Store file
        String folder = String.format("chapters/%s/pages", chapterId);
        String imageUrl = fileStorageService.storeFile(file, folder);
        String thumbnailUrl = fileStorageService.storeThumbnail(file, folder);

        // Create page entity
        Page page = new Page();
        page.setChapter(chapter);
        page.setPageNumber(pageNumber);
        page.setImageUrl(imageUrl);
        page.setThumbnailUrl(thumbnailUrl);
        page.setNotes(notes);
        page.setStatus(Page.PageStatus.UPLOADED);

        page = pageRepository.save(page);
        log.info("Page uploaded successfully: chapter={}, page={}", chapterId, pageNumber);
        return mapToDTO(page);
    }

    @Transactional
    public void deletePage(String id) throws IOException {
        Page page = pageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Page not found"));

        // Delete files from storage
        try {
            fileStorageService.deleteFile(page.getImageUrl());
            fileStorageService.deleteFile(page.getThumbnailUrl());
        } catch (IOException e) {
            log.error("Failed to delete page files", e);
            // Continue with database deletion even if file deletion fails
        }

        // Delete from database
        pageRepository.delete(page);
        log.info("Page deleted successfully: {}", id);
    }

    @Transactional
    public PageDTO updatePageOrder(String id, Integer newPageNumber) {
        Page page = pageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Page not found"));

        // Check if new page number conflicts
        if (!page.getPageNumber().equals(newPageNumber)) {
            if (pageRepository.existsByChapterIdAndPageNumber(
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
            newStatus = Page.PageStatus.valueOf(status.toUpperCase());
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