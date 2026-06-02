package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.UserRepository;
import com.mangaproject.backend.service.RankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/rankings")
@RequiredArgsConstructor
public class RankingController {

    private final RankingService rankingService;
    private final UserRepository userRepository;

    /**
     * GET /api/rankings
     * Tất cả series xếp hạng (Board dùng)
     */
    @GetMapping
    public ApiResponse<List<SeriesRankingDTO>> getAllRankings(
            @RequestParam(required = false) String period) {
        return ApiResponse.success(rankingService.getAllRankings());
    }

    /**
     * GET /api/rankings/my
     * Mangaka xem ranking các series của mình (MyRankings page)
     */
    @GetMapping("/my")
    public ApiResponse<List<SeriesRankingDTO>> getMyRankings(Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(rankingService.getRankingsByMangaka(user.getId()));
    }

    private User getUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}