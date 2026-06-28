package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.UserRepository;
import com.mangaproject.backend.service.EditorService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/editor")
@RequiredArgsConstructor
public class EditorController {

    private final EditorService editorService;
    private final UserRepository userRepository;

    /**
     * GET /api/editor/stats
     * Dashboard stats cho Editor
     */
    @GetMapping("/stats")
    public ApiResponse<EditorStatsDTO> getStats(Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(editorService.getStats(user.getId()));
    }

    /**
     * GET /api/editor/manuscripts
     * Danh sách bản thảo cần Editor xét duyệt
     */
    @GetMapping("/manuscripts")
    public ApiResponse<List<ManuscriptDTO>> getManuscriptsToReview(Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(editorService.getManuscriptsToReview(user.getId()));
    }

    /**
     * POST /api/editor/manuscripts/{id}/annotate
     * Editor ghi chú/đánh dấu lên bản thảo
     */
    @PostMapping("/manuscripts/{id}/annotate")
    public ApiResponse<ManuscriptDTO> addAnnotation(
            @PathVariable String id,
            @RequestBody AnnotateRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(editorService.addAnnotation(id, user.getId(), request));
    }

    @PostMapping("/manuscripts/{id}/submit-to-board")
    public ApiResponse<SubmissionDTO> submitToBoard(
            @PathVariable String id,
            @RequestBody SubmitToBoardRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(
                editorService.submitToBoard(id, user.getId(), request),
                "Đã nộp bản thảo lên Hội đồng biên tập"
        );
    }

    /**
     * PUT /api/editor/manuscripts/{id}/reset
     * Reset manuscript về "under_review" khi Editor đã đánh dấu "Sẵn sàng" nhưng muốn xem lại
     */
    @PutMapping("/manuscripts/{id}/reset")
    public ApiResponse<ManuscriptDTO> resetManuscript(
            @PathVariable String id,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(
                editorService.resetManuscriptToUnderReview(id, user.getId()),
                "Đã reset bản thảo về trạng thái đang xét"
        );
    }

    @PutMapping("/manuscripts/{id}/status")
    public ApiResponse<ManuscriptDTO> updateManuscriptStatus(
            @PathVariable String id,
            @RequestBody UpdateManuscriptStatusRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(
                editorService.updateManuscriptStatus(id, user.getId(), request),
                "Đã cập nhật trạng thái bản thảo"
        );
    }

    /**
     * GET /api/editor/studio-progress
     * Tiến độ real-time của tất cả studio Editor phụ trách
     */
    @GetMapping("/studio-progress")
    public ApiResponse<List<StudioProgressDTO>> getStudioProgress(Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(editorService.getStudioProgress(user.getId()));
    }

    private User getUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}