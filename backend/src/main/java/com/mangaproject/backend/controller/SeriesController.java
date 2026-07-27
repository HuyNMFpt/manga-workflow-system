package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.UserRepository;
import com.mangaproject.backend.service.FileStorageService;
import com.mangaproject.backend.service.SeriesService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController
@RequestMapping("/api/series")
@RequiredArgsConstructor
public class SeriesController {

    private final SeriesService seriesService;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @GetMapping
    public ApiResponse<List<SeriesDTO>> getAllSeries(
            @RequestParam(required = false) String status) {
        return ApiResponse.success(seriesService.getAllSeries(status));
    }

    @GetMapping("/{id}")
    public ApiResponse<SeriesDTO> getById(@PathVariable String id) {
        return ApiResponse.success(seriesService.getById(id));
    }

    @PostMapping(consumes = "multipart/form-data")
    public ApiResponse<SeriesDTO> createSeries(
            @RequestParam("title") String title,
            @RequestParam("genre") String genre,
            @RequestParam("synopsis") String synopsis,
            @RequestParam(value = "coverUrl", required = false) String coverUrl,
            @RequestParam(value = "schedule", required = false) String schedule,
            @RequestParam(value = "editorId", required = false) String editorId,
            @RequestParam(value = "cover", required = false) MultipartFile cover,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        CreateSeriesRequest request = new CreateSeriesRequest();
        request.setTitle(title);
        request.setGenre(genre);
        request.setSynopsis(synopsis);
        request.setSchedule(schedule);
        request.setEditorId(editorId);

        // Mục 5: lưu file cover trước, ghi đè coverUrl string
        if (cover != null && !cover.isEmpty()) {
            try {
                String uploadedUrl = fileStorageService.storeFile(cover, "series/covers");
                request.setCoverUrl(uploadedUrl);
            } catch (Exception e) {
                request.setCoverUrl(coverUrl); // fallback về string nếu upload lỗi
            }
        } else {
            request.setCoverUrl(coverUrl); // giữ nguyên string URL nếu không có file
        }

        return ApiResponse.success(seriesService.createSeries(request, user.getId()));
    }

    @GetMapping("/my")
    public ApiResponse<PaginatedResponse<SeriesDTO>> getMySeries(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ApiResponse.success(seriesService.getSeriesByMangaka(user.getId()));
    }

    @PutMapping("/{id}/status")
    public ApiResponse<SeriesDTO> updateStatus(
            @PathVariable String id,
            @RequestParam String status) {
        return ApiResponse.success(seriesService.updateStatus(id, status));
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ApiResponse<SeriesDTO> updateSeries(
            @PathVariable String id,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "genre", required = false) String genre,
            @RequestParam(value = "synopsis", required = false) String synopsis,
            @RequestParam(value = "coverUrl", required = false) String coverUrl,
            @RequestParam(value = "editorId", required = false) String editorId,
            @RequestParam(value = "cover", required = false) MultipartFile cover,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Mục 5: lưu file cover mới nếu có, không thì giữ coverUrl string
        String resolvedCoverUrl = coverUrl;
        if (cover != null && !cover.isEmpty()) {
            try {
                resolvedCoverUrl = fileStorageService.storeFile(cover, "series/covers");
            } catch (Exception ignored) {}
        }

        return ApiResponse.success(seriesService.updateSeries(id, title, genre, synopsis, resolvedCoverUrl, editorId, user.getId()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteSeries(
            @PathVariable String id,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        seriesService.deleteSeries(id, user.getId());
        return ApiResponse.success(null, "Đã xóa series");
    }

    @PostMapping("/{id}/message")
    public ApiResponse<Void> sendMessageToEditor(
            @PathVariable String id,
            @RequestBody SeriesMessageRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        seriesService.sendMessageToEditor(id, request, user.getId());
        return ApiResponse.success(null, "Đã gửi yêu cầu cho Editor");
    }
}