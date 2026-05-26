package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/rankings")
@RequiredArgsConstructor
public class RankingController {

    @GetMapping
    public ApiResponse<List<Object>> getRankings(@RequestParam(required = false) String period) {
        // Mock data tạm
        return ApiResponse.success(new ArrayList<>());
    }
}