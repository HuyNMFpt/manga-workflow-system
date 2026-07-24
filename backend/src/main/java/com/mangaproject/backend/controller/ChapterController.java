package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.ApiResponse;
import com.mangaproject.backend.dto.ChapterDTO;
import com.mangaproject.backend.dto.CreateChapterRequest;
import com.mangaproject.backend.service.ChapterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chapters")
@RequiredArgsConstructor
@Tag(name = "Chapter Management", description = "APIs for managing manga chapters")
public class ChapterController {

    private final ChapterService chapterService;

    @GetMapping
    @Operation(summary = "Get chapters by series", description = "Retrieve all chapters for a specific series")
    public ResponseEntity<ApiResponse<List<ChapterDTO>>> getChaptersBySeries(
            @RequestParam String seriesId) {
        List<ChapterDTO> chapters = chapterService.getChaptersBySeries(seriesId);
        return ResponseEntity.ok(new ApiResponse<>(chapters, null, true));
    }

    // ← THÊM MỚI: frontend gọi GET /api/chapters/series/{seriesId}
    @GetMapping("/series/{seriesId}")
    @Operation(summary = "Get chapters by series ID (path)", description = "Retrieve all chapters for a series by path variable")
    public ApiResponse<List<ChapterDTO>> getChaptersBySeriesPath(@PathVariable String seriesId) {
        List<ChapterDTO> chapters = chapterService.getChaptersBySeries(seriesId);
        return ApiResponse.success(chapters);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get chapter by ID", description = "Retrieve a specific chapter with all pages")
    public ResponseEntity<ApiResponse<ChapterDTO>> getChapterById(@PathVariable String id) {
        ChapterDTO chapter = chapterService.getChapterById(id);
        return ResponseEntity.ok(new ApiResponse<>(chapter, null, true));
    }

    @PostMapping
    @Operation(summary = "Create new chapter", description = "Create a new chapter for a series")
    public ResponseEntity<ApiResponse<ChapterDTO>> createChapter(
            @Valid @RequestBody CreateChapterRequest request,
            Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        ChapterDTO chapter = chapterService.createChapter(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(chapter, "Chapter created successfully", true));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update chapter", description = "Update chapter information")
    public ResponseEntity<ApiResponse<ChapterDTO>> updateChapter(
            @PathVariable String id,
            @Valid @RequestBody CreateChapterRequest request) {
        ChapterDTO chapter = chapterService.updateChapter(id, request);
        return ResponseEntity.ok(new ApiResponse<>(chapter, "Chapter updated successfully", true));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete chapter", description = "Delete a chapter (only if not published)")
    public ResponseEntity<ApiResponse<Void>> deleteChapter(@PathVariable String id) {
        chapterService.deleteChapter(id);
        return ResponseEntity.ok(new ApiResponse<>(null, "Chapter deleted successfully", true));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Update chapter status", description = "Change chapter status")
    public ResponseEntity<ApiResponse<ChapterDTO>> updateChapterStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        String status = request.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(null, "Status is required", false));
        }
        String userId = (String) authentication.getPrincipal();
        ChapterDTO chapter = chapterService.updateChapterStatus(id, status, userId);
        return ResponseEntity.ok(new ApiResponse<>(chapter, "Chapter status updated", true));
    }
}