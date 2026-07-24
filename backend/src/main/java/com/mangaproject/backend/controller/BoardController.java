package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.UserRepository;
import com.mangaproject.backend.service.BoardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/board")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;
    private final UserRepository userRepository;

    /**
     * GET /api/board/stats
     * Dashboard stats cho Board
     */
    @GetMapping("/stats")
    public ApiResponse<BoardStatsDTO> getStats() {
        return ApiResponse.success(boardService.getStats());
    }

    /**
     * GET /api/board/voting-queue
     * Danh sách submissions chờ Board vote
     */
    @GetMapping("/voting-queue")
    public ApiResponse<List<SubmissionDetailDTO>> getVotingQueue(Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(boardService.getPendingSubmissions(user.getId()));
    }

    /**
     * POST /api/board/vote
     * Board member bỏ phiếu cho 1 submission
     * Khi approve: kèm schedule (weekly/monthly)
     */
    @PostMapping("/vote")
    public ApiResponse<SubmissionDTO> castVote(
            @Valid @RequestBody VoteRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(boardService.castVote(request, user.getId()),
                "Phiếu bầu đã được ghi nhận");
    }

    /**
     * POST /api/board/rankings/input
     * Nhập dữ liệu bình chọn độc giả sau mỗi kỳ
     */
    @PostMapping("/rankings/input")
    public ApiResponse<ReaderPollDTO> inputPollData(
            @Valid @RequestBody PollInputRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(boardService.inputPollData(request, user.getId()),
                "Dữ liệu bình chọn đã được cập nhật");
    }

    /**
     * GET /api/board/rankings
     * Xem bảng xếp hạng tất cả series
     */
    @GetMapping("/rankings")
    public ApiResponse<List<SeriesRankingDTO>> getRankings() {
        return ApiResponse.success(boardService.getAllRankings());
    }

    /**
     * POST /api/board/decisions
     * @deprecated Quyết định 1 người không qua bỏ phiếu. Dùng /board/proposals + /board/proposals/vote thay thế.
     */
    @Deprecated
    @PostMapping("/decisions")
    public ApiResponse<SeriesDTO> makeDecision(
            @Valid @RequestBody EditorialDecisionRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(boardService.makeDecision(request, user.getId()),
                "Quyết định đã được thực hiện");
    }

    /**
     * GET /api/board/submissions/{submissionId}/votes
     * Xem chi tiết danh sách phiếu bầu — Board cuối xem trước khi quyết định
     */
    @GetMapping("/submissions/{submissionId}/votes")
    public ApiResponse<List<BoardVoteDetailDTO>> getVoteDetails(
            @PathVariable String submissionId,
            Authentication authentication) {
        return ApiResponse.success(boardService.getVoteDetails(submissionId));
    }

    /**
     * POST /api/board/proposals
     * Board member đề xuất quyết định cancel/hiatus/reinstate/change_schedule — KHÔNG tự quyết ngay
     */
    @PostMapping("/proposals")
    public ApiResponse<EditorialProposalDTO> createProposal(
            @Valid @RequestBody CreateProposalRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(boardService.createProposal(request, user.getId()),
                "Đề xuất đã được tạo, chờ Board bỏ phiếu");
    }

    /**
     * POST /api/board/proposals/vote
     * Mỗi Board member bỏ phiếu yes/no/abstain cho 1 đề xuất, đủ quorum thì tự chốt
     */
    @PostMapping("/proposals/vote")
    public ApiResponse<EditorialProposalDTO> voteOnProposal(
            @Valid @RequestBody EditorialVoteRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(boardService.castEditorialVote(request, user.getId()),
                "Phiếu bầu đã được ghi nhận");
    }

    /**
     * GET /api/board/proposals
     * Danh sách đề xuất đang chờ Board bỏ phiếu
     */
    @GetMapping("/proposals")
    public ApiResponse<List<EditorialProposalDTO>> getActiveProposals(Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(boardService.getActiveProposals(user.getId()));
    }

    /**
     * GET /api/board/at-risk
     * Danh sách series có nguy cơ bị huỷ
     */
    @GetMapping("/at-risk")
    public ApiResponse<List<SeriesRankingDTO>> getAtRiskSeries() {
        return ApiResponse.success(boardService.getAllRankings().stream()
                .filter(SeriesRankingDTO::isAtRisk)
                .collect(java.util.stream.Collectors.toList()));
    }

    private User getUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}