package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.UserRepository;
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

    @GetMapping
    public ApiResponse<List<SeriesDTO>> getAllSeries() {
        return ApiResponse.success(seriesService.getAllSeries());
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
            @RequestParam(value = "cover", required = false) MultipartFile cover,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        CreateSeriesRequest request = new CreateSeriesRequest();
        request.setTitle(title);
        request.setGenre(genre);
        request.setSynopsis(synopsis);
        request.setCoverUrl(coverUrl);
        request.setSchedule(schedule);

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
}