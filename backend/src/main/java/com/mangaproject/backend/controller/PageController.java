package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.ApiResponse;
import com.mangaproject.backend.dto.PageDTO;
import com.mangaproject.backend.dto.PageUploadRequest;
import com.mangaproject.backend.service.PageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/pages")
@RequiredArgsConstructor
@Tag(name = "Page Management", description = "APIs for managing manga pages")
public class PageController {

    private final PageService pageService;

    @GetMapping
    @Operation(summary = "Get pages by chapter", description = "Retrieve all pages for a specific chapter")
    public ResponseEntity<ApiResponse<List<PageDTO>>> getPagesByChapter(
            @RequestParam String chapterId) {
        List<PageDTO> pages = pageService.getPagesByChapter(chapterId);
        return ResponseEntity.ok(new ApiResponse<>(pages, null, true));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get page by ID", description = "Retrieve a specific page")
    public ResponseEntity<ApiResponse<PageDTO>> getPageById(@PathVariable String id) {
        PageDTO page = pageService.getPageById(id);
        return ResponseEntity.ok(new ApiResponse<>(page, null, true));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload page", description = "Upload a manga page image")
    public ResponseEntity<ApiResponse<PageDTO>> uploadPage(
            @Valid @ModelAttribute PageUploadRequest request) {
        try {
            PageDTO page = pageService.uploadPage(
                    request.getChapterId(),
                    request.getPageNumber(),
                    request.getFile(),
                    request.getNotes()
            );
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new ApiResponse<>(page, "Page uploaded successfully", true));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(null, "Failed to upload page: " + e.getMessage(), false));
        }
    }

    // ── Batch Upload — nhiều ảnh cùng lúc ────────────────────────
    @PostMapping(value = "/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Batch upload pages", description = "Upload multiple page images at once")
    public ResponseEntity<ApiResponse<List<PageDTO>>> uploadPages(
            @RequestParam("chapterId") String chapterId,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "startPageNumber", required = false) Integer startPageNumber,
            @RequestParam(value = "notes", required = false) String notes) {
        try {
            List<PageDTO> result = pageService.uploadPages(chapterId, files, startPageNumber, notes);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new ApiResponse<>(result, "Upload thành công " + result.size() + " trang", true));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(null, "Failed to batch upload: " + e.getMessage(), false));
        }
    }

    // ── PDF Upload — extract từng trang thành ảnh ────────────────
    @PostMapping(value = "/upload-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload PDF", description = "Upload PDF and extract each page as image")
    public ResponseEntity<ApiResponse<List<PageDTO>>> uploadPdf(
            @RequestParam("chapterId") String chapterId,
            @RequestParam("file") MultipartFile pdfFile,
            @RequestParam(value = "startPageNumber", required = false) Integer startPageNumber) {
        if (!Objects.requireNonNull(pdfFile.getOriginalFilename()).toLowerCase().endsWith(".pdf")) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(null, "Chỉ chấp nhận file PDF", false));
        }
        try {
            List<PageDTO> result = pageService.uploadPdf(chapterId, pdfFile, startPageNumber);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new ApiResponse<>(result,
                            "Upload PDF thành công — " + result.size() + " trang được tạo", true));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(null, "Failed to upload PDF: " + e.getMessage(), false));
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete page", description = "Delete a page and its associated file")
    public ResponseEntity<ApiResponse<Void>> deletePage(@PathVariable String id) {
        try {
            pageService.deletePage(id);
            return ResponseEntity.ok(new ApiResponse<>(null, "Page deleted successfully", true));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(null, "Failed to delete page: " + e.getMessage(), false));
        }
    }

    @PutMapping("/{id}/order")
    @Operation(summary = "Update page order", description = "Change page number/order")
    public ResponseEntity<ApiResponse<PageDTO>> updatePageOrder(
            @PathVariable String id,
            @RequestBody Map<String, Integer> request) {
        Integer pageNumber = request.get("pageNumber");
        if (pageNumber == null) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(null, "Page number is required", false));
        }
        PageDTO page = pageService.updatePageOrder(id, pageNumber);
        return ResponseEntity.ok(new ApiResponse<>(page, "Page order updated", true));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Update page status", description = "Change page status")
    public ResponseEntity<ApiResponse<PageDTO>> updatePageStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> request) {
        String status = request.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(null, "Status is required", false));
        }
        PageDTO page = pageService.updatePageStatus(id, status);
        return ResponseEntity.ok(new ApiResponse<>(page, "Page status updated", true));
    }
}