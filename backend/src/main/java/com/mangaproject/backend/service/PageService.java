package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.PageDTO;
import com.mangaproject.backend.model.Chapter;
import com.mangaproject.backend.model.Page;
import com.mangaproject.backend.repository.ChapterRepository;
import com.mangaproject.backend.repository.PageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
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

    // ── Batch Upload — nhiều ảnh cùng lúc ──────────────────────────
    @Transactional
    public List<PageDTO> uploadPages(String chapterId, List<MultipartFile> files,
                                     Integer startPageNumber, String notes) throws IOException {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));

        int nextPage = startPageNumber != null ? startPageNumber :
                pageRepository.findMaxPageNumberByChapterId(chapterId)
                        .map(max -> max + 1)
                        .orElse(1);

        List<PageDTO> result = new ArrayList<>();
        for (MultipartFile file : files) {
            if (pageRepository.existsByChapter_IdAndPageNumber(chapterId, nextPage)) {
                throw new RuntimeException("Trang " + nextPage + " đã tồn tại trong chapter này");
            }

            String folder = String.format("chapters/%s/pages", chapterId);
            String imageUrl = fileStorageService.storeFile(file, folder);
            String thumbnailUrl = fileStorageService.storeThumbnail(file, folder);

            Page page = new Page();
            page.setChapter(chapter);
            page.setPageNumber(nextPage);
            page.setImageUrl(imageUrl);
            page.setThumbnailUrl(thumbnailUrl);
            page.setNotes(notes);
            page.setStatus(Page.PageStatus.in_progress);
            result.add(mapToDTO(pageRepository.save(page)));

            log.info("Batch upload: chapter={}, page={}", chapterId, nextPage);
            nextPage++;
        }

        // Cập nhật total_pages của chapter
        long totalPages = pageRepository.countByChapter_Id(chapterId);
        chapter.setTotalPages((int) totalPages);
        chapterRepository.save(chapter);

        return result;
    }

    // ── PDF Upload — extract từng trang PDF thành ảnh ────────────
    @Transactional
    public List<PageDTO> uploadPdf(String chapterId, MultipartFile pdfFile,
                                   Integer startPageNumber) throws IOException {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));

        int nextPage = startPageNumber != null ? startPageNumber :
                pageRepository.findMaxPageNumberByChapterId(chapterId)
                        .map(max -> max + 1)
                        .orElse(1);

        List<PageDTO> result = new ArrayList<>();

        try (PDDocument document = Loader.loadPDF(pdfFile.getBytes())) {
            PDFRenderer renderer = new PDFRenderer(document);
            int totalPdfPages = document.getNumberOfPages();

            for (int i = 0; i < totalPdfPages; i++) {
                // Render trang PDF thành ảnh 150 DPI
                BufferedImage image = renderer.renderImageWithDPI(i, 150, ImageType.RGB);

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(image, "jpg", baos);
                byte[] imageBytes = baos.toByteArray();

                // Wrap thành MultipartFile để tái dùng FileStorageService
                MultipartFile mockFile = new ByteArrayMultipartFile(
                        "page_" + (i + 1) + ".jpg",
                        "image/jpeg",
                        imageBytes
                );

                String folder = String.format("chapters/%s/pages", chapterId);
                String imageUrl = fileStorageService.storeFile(mockFile, folder);
                String thumbnailUrl = fileStorageService.storeThumbnail(mockFile, folder);

                Page page = new Page();
                page.setChapter(chapter);
                page.setPageNumber(nextPage + i);
                page.setImageUrl(imageUrl);
                page.setThumbnailUrl(thumbnailUrl);
                page.setNotes("PDF trang " + (i + 1));
                page.setStatus(Page.PageStatus.in_progress);
                result.add(mapToDTO(pageRepository.save(page)));

                log.info("PDF extract: chapter={}, page={}/{}", chapterId, i + 1, totalPdfPages);
            }
        }

        // Cập nhật total_pages
        long totalPages = pageRepository.countByChapter_Id(chapterId);
        chapter.setTotalPages((int) totalPages);
        chapterRepository.save(chapter);

        return result;
    }

    // ── ByteArrayMultipartFile — wrap byte[] thành MultipartFile ──
    private static class ByteArrayMultipartFile implements MultipartFile {
        private final String name;
        private final String contentType;
        private final byte[] content;

        public ByteArrayMultipartFile(String name, String contentType, byte[] content) {
            this.name = name;
            this.contentType = contentType;
            this.content = content;
        }

        @Override public String getName() { return name; }
        @Override public String getOriginalFilename() { return name; }
        @Override public String getContentType() { return contentType; }
        @Override public boolean isEmpty() { return content.length == 0; }
        @Override public long getSize() { return content.length; }
        @Override public byte[] getBytes() { return content; }
        @Override public InputStream getInputStream() { return new ByteArrayInputStream(content); }
        @Override public void transferTo(java.io.File dest) throws IOException {
            java.nio.file.Files.write(dest.toPath(), content);
        }
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