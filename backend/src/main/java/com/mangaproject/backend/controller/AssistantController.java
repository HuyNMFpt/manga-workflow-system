package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.UserRepository;
import com.mangaproject.backend.service.AssistantService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;
    private final UserRepository userRepository;

    /**
     * GET /api/assistant/stats
     * Dashboard stats: số task pending, in_progress, approved, quá hạn, thu nhập tháng này
     */
    @GetMapping("/stats")
    public ApiResponse<AssistantStatsDTO> getStats(Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(assistantService.getStats(user.getId()));
    }

    /**
     * GET /api/assistant/earnings
     * Thu nhập chi tiết: tổng, theo tháng, theo loại task
     * EarningsDashboard frontend dùng endpoint này
     */
    @GetMapping("/earnings")
    public ApiResponse<EarningsDTO> getEarnings(Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(assistantService.getEarnings(user.getId()));
    }

    private User getUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
