package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.*;
import com.mangaproject.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BoardService {

    private final SeriesRepository seriesRepository;
    private final SubmissionRepository submissionRepository;
    private final ManuscriptRepository manuscriptRepository;
    private final ReaderPollRepository readerPollRepository;
    private final UserRepository userRepository;
    private final BoardVoteRepository boardVoteRepository;
    private final NotificationRepository notificationRepository;
    private final LookupResolverService lookupResolverService;
    private final EditorialProposalRepository editorialProposalRepository;
    private final EditorialVoteRepository editorialVoteRepository;

    // ── Dashboard stats ──────────────────────────────────────────
    public BoardStatsDTO getStats() {
        // Chờ vote: dedup theo seriesId — mỗi series chỉ tính 1 lần dù có nhiều submission (nộp lại nhiều lần)
        List<Submission> pendingOrVoting = new ArrayList<>();
        pendingOrVoting.addAll(submissionRepository.findByStatusOrderByCreatedAtDesc(Submission.SubmissionStatus.pending));
        pendingOrVoting.addAll(submissionRepository.findByStatusOrderByCreatedAtDesc(Submission.SubmissionStatus.voting));

        // Cache seriesId để tránh N+1 queries
        Map<String, String> subToSeriesId = new HashMap<>();
        pendingOrVoting.forEach(sub -> subToSeriesId.computeIfAbsent(sub.getId(),
                k -> getSeriesIdFromSubmission(sub)));

        int pendingVotes = (int) pendingOrVoting.stream()
                // Filter bỏ series đã publishing/cancelled — giống getPendingSubmissions()
                .filter(sub -> {
                    String sid = subToSeriesId.getOrDefault(sub.getId(), null);
                    if (sid == null) return false;
                    Series s = seriesRepository.findById(sid).orElse(null);
                    return s != null
                            && s.getStatus() != Series.SeriesStatus.publishing
                            && s.getStatus() != Series.SeriesStatus.cancelled;
                })
                .collect(Collectors.toMap(
                        sub -> subToSeriesId.getOrDefault(sub.getId(), sub.getId()),
                        sub -> sub,
                        (existing, incoming) -> incoming.getCreatedAt() != null
                                && (existing.getCreatedAt() == null
                                || incoming.getCreatedAt().isAfter(existing.getCreatedAt()))
                                ? incoming : existing
                ))
                .size();

        int totalActive = (int) seriesRepository
                .findByStatusIn(List.of(Series.SeriesStatus.publishing)).size();

        int atRisk = (int) seriesRepository.findAll().stream()
                .filter(s -> s.getCancellationRisk() != null && s.getCancellationRisk())
                .count();

        // Quyết định tháng này — dùng query có filter thay vì findAll() (tối ưu)
        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        List<Submission> decidedThisMonth = submissionRepository.findByStatusInAndDecidedAtAfter(
                List.of(Submission.SubmissionStatus.approved, Submission.SubmissionStatus.rejected),
                startOfMonth);
        int decisionsThisMonth = (int) decidedThisMonth.stream()
                .collect(Collectors.toMap(
                        this::getSeriesIdFromSubmission,
                        sub -> sub,
                        (existing, incoming) -> incoming.getDecidedAt() != null
                                && (existing.getDecidedAt() == null
                                || incoming.getDecidedAt().isAfter(existing.getDecidedAt()))
                                ? incoming : existing
                ))
                .size();

        return new BoardStatsDTO(pendingVotes, totalActive, atRisk, decisionsThisMonth);
    }

    // Lấy seriesId của một submission thông qua manuscript liên kết.
    // Fallback về sub.getId() nếu không tìm thấy manuscript/series, để không gộp nhầm các submission rời rạc.
    private String getSeriesIdFromSubmission(Submission sub) {
        return manuscriptRepository.findById(sub.getManuscriptId())
                .map(Manuscript::getSeriesId)
                .orElse(sub.getId());
    }

    // ── Voting Queue — danh sách submissions chờ vote ────────────
    public List<SubmissionDetailDTO> getPendingSubmissions(String boardMemberId) {
        List<Submission> allSubmissions = new ArrayList<>();
        allSubmissions.addAll(submissionRepository.findByStatusOrderByCreatedAtDesc(Submission.SubmissionStatus.pending));
        allSubmissions.addAll(submissionRepository.findByStatusOrderByCreatedAtDesc(Submission.SubmissionStatus.voting));

        // Dedup: chỉ lấy submission mới nhất theo seriesId (không phải manuscriptId — mỗi lần
        // Mangaka nộp lại sẽ tạo manuscript mới với id khác, nên dedup theo manuscriptId không
        // gộp được các submission của cùng 1 series)
        Map<String, Submission> latestBySeriesId = new LinkedHashMap<>();
        for (Submission sub : allSubmissions) {
            String seriesId = getSeriesIdFromSubmission(sub);
            if (seriesId == null) continue;
            // allSubmissions đã sort Desc theo createdAt nên phần tử đầu tiên gặp là mới nhất
            latestBySeriesId.putIfAbsent(seriesId, sub);
        }
        // Batch load series để filter + dùng trong stream (tránh N+1 queries)
        Map<String, Series> seriesMap = seriesRepository.findAllById(latestBySeriesId.keySet()).stream()
                .collect(Collectors.toMap(Series::getId, s -> s));

        // Filter: bỏ series đã publishing hoặc cancelled
        List<Submission> submissions = latestBySeriesId.entrySet().stream()
                .filter(e -> {
                    Series s = seriesMap.get(e.getKey());
                    return s != null
                            && s.getStatus() != Series.SeriesStatus.publishing
                            && s.getStatus() != Series.SeriesStatus.cancelled;
                })
                .map(Map.Entry::getValue)
                .collect(Collectors.toList());

        // Batch load manuscripts
        Set<String> manuscriptIds = submissions.stream()
                .map(Submission::getManuscriptId).collect(Collectors.toSet());
        Map<String, Manuscript> msMap = manuscriptRepository.findAllById(manuscriptIds).stream()
                .collect(Collectors.toMap(Manuscript::getId, m -> m));

        Set<String> userIds = new java.util.HashSet<>();
        seriesMap.values().forEach(s -> { if (s.getMangakaId() != null) userIds.add(s.getMangakaId()); });
        submissions.forEach(s -> { if (s.getSubmittedBy() != null) userIds.add(s.getSubmittedBy()); });
        Map<String, com.mangaproject.backend.model.User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(com.mangaproject.backend.model.User::getId, u -> u));

        return submissions.stream().map(sub -> {
            Manuscript ms = msMap.get(sub.getManuscriptId());
            Series series = ms != null ? seriesMap.get(ms.getSeriesId()) : null;
            com.mangaproject.backend.model.User mangakaUser = series != null ? userMap.get(series.getMangakaId()) : null;
            String mangakaName = mangakaUser != null
                    ? (mangakaUser.getName() != null ? mangakaUser.getName() : mangakaUser.getUsername())
                    : "Unknown";
            com.mangaproject.backend.model.User editorUser = userMap.get(sub.getSubmittedBy());
            String editorName = editorUser != null
                    ? (editorUser.getName() != null ? editorUser.getName() : editorUser.getUsername())
                    : "Unknown";

            String desc = ms != null ? ms.getDescription() : "";

            SubmissionDetailDTO dto = new SubmissionDetailDTO();
            dto.setSubmissionId(sub.getId());
            dto.setManuscriptId(sub.getManuscriptId());
            dto.setSeriesId(series != null ? series.getId() : "");
            dto.setSeriesTitle(series != null ? series.getTitle() : "");
            dto.setSeriesGenre(series != null ? series.getGenre() : "");
            dto.setSeriesStatus(series != null ? series.getStatus().name() : null);
            dto.setSynopsis(series != null ? series.getSynopsis() : "");
            dto.setMangakaId(series != null ? series.getMangakaId() : "");
            dto.setMangakaName(mangakaName);
            dto.setFileUrl(ms != null ? ms.getFileUrl() : "");
            dto.setDescription(desc);
            dto.setSubmissionRound(sub.getSubmissionRound());
            dto.setCoverLetter(sub.getCoverLetter());
            dto.setStatus(sub.getStatus().name());
            dto.setVoteYes(sub.getVoteYes());
            dto.setVoteNo(sub.getVoteNo());
            dto.setVoteAbstain(sub.getVoteAbstain());
            dto.setVotingDeadline(sub.getVotingDeadline() != null ? sub.getVotingDeadline().toString() : null);
            dto.setCreatedAt(sub.getCreatedAt() != null ? sub.getCreatedAt().toString() : null);
            dto.setHasVoted(boardVoteRepository.existsBySubmissionIdAndVoterId(sub.getId(), boardMemberId));
            dto.setEditorName(editorName);
            // Đọc trực tiếp từ Submission thay vì parse text từ manuscript.description —
            // đáng tin cậy hơn vì không phụ thuộc việc manuscriptId của submission có
            // đúng version đã được editor đánh giá hay không.
            dto.setAudienceSummary(sub.getAudienceSummary());
            dto.setMarketingAngle(sub.getMarketingAngle());
            dto.setWhyItWillSell(sub.getWhyItWillSell());
            dto.setRecommendedSchedule(sub.getRecommendedSchedule());
            dto.setEditorNote(sub.getEditorNote());
            return dto;
        }).collect(Collectors.toList());
    }

    // ── Vote ─────────────────────────────────────────────────────
    @Transactional
    public SubmissionDTO castVote(VoteRequest request, String boardMemberId) {
        Submission submission = submissionRepository.findById(request.getSubmissionId())
                .orElseThrow(() -> new RuntimeException("Submission not found"));

        // Chặn vote 2 lần
        if (boardVoteRepository.existsBySubmissionIdAndVoterId(request.getSubmissionId(), boardMemberId)) {
            throw new RuntimeException("Bạn đã bỏ phiếu cho submission này rồi");
        }

        // Ghi nhận vote vào board_votes table
        BoardVote boardVote = new BoardVote();
        boardVote.setSubmissionId(request.getSubmissionId());
        boardVote.setVoterId(boardMemberId);
        boardVote.setComment(request.getJustification());
        switch (request.getDecision()) {
            case "approve"  -> boardVote.setVote(BoardVote.VoteChoice.yes);
            case "reject"   -> boardVote.setVote(BoardVote.VoteChoice.no);
            default         -> boardVote.setVote(BoardVote.VoteChoice.abstain);
        }
        boardVoteRepository.save(boardVote);

        submission.setStatus(Submission.SubmissionStatus.voting);

        switch (request.getDecision()) {
            case "approve" -> submission.setVoteYes(submission.getVoteYes() + 1);
            case "reject" -> submission.setVoteNo(submission.getVoteNo() + 1);
            case "revision" -> submission.setVoteAbstain(submission.getVoteAbstain() + 1);
        }

        // Kiểm tra kết quả: cần 3 vote yes để approve (có thể điều chỉnh)
        int totalVotes = submission.getVoteYes() + submission.getVoteNo() + submission.getVoteAbstain();
        if (totalVotes >= 3) {
            if (submission.getVoteYes() > submission.getVoteNo()) {
                // Approved
                submission.setStatus(Submission.SubmissionStatus.approved);
                submission.setDecidedAt(LocalDateTime.now());

                // Cập nhật series
                Manuscript ms = manuscriptRepository.findById(submission.getManuscriptId()).orElse(null);
                if (ms != null) {
                    Series series = seriesRepository.findById(ms.getSeriesId()).orElse(null);
                    if (series != null) {
                        series.setStatus(Series.SeriesStatus.publishing);
                        if (request.getSchedule() != null) {
                            try {
                                series.setPublishSchedule(Series.PublishSchedule.valueOf(request.getSchedule()));
                                series.setPublishScheduleId(
                                        lookupResolverService.resolvePublishScheduleId(series.getPublishSchedule()));
                            } catch (IllegalArgumentException ignored) {}
                        }
                        seriesRepository.save(series);
                    }
                    ms.setStatus(Manuscript.ManuscriptStatus.publishing);
                    manuscriptRepository.save(ms);
                }
            } else {
                // Rejected
                submission.setStatus(Submission.SubmissionStatus.rejected);
                submission.setDecidedAt(LocalDateTime.now());

                // Cập nhật series → cancelled
                Manuscript ms = manuscriptRepository.findById(submission.getManuscriptId()).orElse(null);
                if (ms != null) {
                    Series series = seriesRepository.findById(ms.getSeriesId()).orElse(null);
                    if (series != null) {
                        series.setStatus(Series.SeriesStatus.cancelled);
                        seriesRepository.save(series);

                        // Gửi notification cho Mangaka
                        Notification notification = new Notification();
                        notification.setUserId(series.getMangakaId());
                        notification.setType(Notification.NotificationType.submission_result);
                        notification.setNotificationTypeId(
                                lookupResolverService.resolveNotificationTypeId(Notification.NotificationType.submission_result));
                        notification.setReferenceId(series.getId());
                        notification.setReferenceType("series");
                        notification.setMessage(String.format(
                                "Series \"%s\" đã bị Hội đồng biên tập từ chối. Bạn có thể cập nhật và nộp lại.",
                                series.getTitle()
                        ));
                        notificationRepository.save(notification);
                    }
                    ms.setStatus(Manuscript.ManuscriptStatus.rejected);
                    manuscriptRepository.save(ms);
                }
            }
        }

        submission = submissionRepository.save(submission);

        // Resolve seriesId và seriesTitle cho response
        Manuscript msForDto = manuscriptRepository.findById(submission.getManuscriptId()).orElse(null);
        String resolvedSeriesId = msForDto != null ? msForDto.getSeriesId() : "";
        String resolvedSeriesTitle = "";
        if (msForDto != null) {
            resolvedSeriesTitle = seriesRepository.findById(msForDto.getSeriesId())
                    .map(Series::getTitle).orElse("");
        }

        return new SubmissionDTO(
                submission.getId(), submission.getManuscriptId(), resolvedSeriesId, resolvedSeriesTitle,
                submission.getSubmittedBy(), submission.getSubmissionRound(),
                submission.getCoverLetter(), submission.getStatus().name(),
                submission.getVoteYes(), submission.getVoteNo(), submission.getVoteAbstain(),
                submission.getVotingDeadline() != null ? submission.getVotingDeadline().toString() : null,
                submission.getCreatedAt() != null ? submission.getCreatedAt().toString() : null,
                null
        );
    }

    // ── Nhập poll data ────────────────────────────────────────────
    @Transactional
    public ReaderPollDTO inputPollData(PollInputRequest request, String boardMemberId) {
        Series series = seriesRepository.findById(request.getSeriesId())
                .orElseThrow(() -> new RuntimeException("Series not found"));

        // #8 — chỉ cho nhập poll cho series đang publishing
        if (series.getStatus() != Series.SeriesStatus.publishing) {
            throw new RuntimeException(
                "Chỉ có thể nhập poll cho series đang xuất bản (publishing). "
                + "Trạng thái hiện tại: " + series.getStatus().name()
            );
        }

        // #4 — Tự tính rankPosition từ voteCount, không nhận từ request nữa
        int autoRank = readerPollRepository.countByPollPeriodAndPollYearAndVoteCountGreaterThan(
                request.getPollPeriod(), request.getPollYear(), request.getVoteCount()
        ) + 1;

        ReaderPoll poll = new ReaderPoll();
        poll.setSeriesId(request.getSeriesId());
        poll.setEnteredBy(boardMemberId);
        poll.setPollPeriod(request.getPollPeriod());
        poll.setPollYear(request.getPollYear());
        poll.setRankPosition(autoRank);
        poll.setVoteCount(request.getVoteCount());
        poll.setReaderScore(request.getReaderScore());
        poll.setReaderVoteCount(request.getReaderVoteCount());
        poll.setNotes(request.getNotes());
        poll.setPollDate(request.getPollDate() != null
                ? LocalDate.parse(request.getPollDate())
                : LocalDate.now());

        poll = readerPollRepository.save(poll);

        // Cập nhật current_rank trên series
        series.setPreviousRank(series.getCurrentRank());
        series.setCurrentRank(autoRank);

        // #6 — Check cancellation risk: rank > 20 LIÊN TIẾP 3 kỳ gần nhất
        // (không đếm tổng toàn bộ lịch sử, dừng ngay khi gặp 1 kỳ không thấp)
        List<ReaderPoll> recentPolls = readerPollRepository
                .findTop5BySeriesIdOrderByPollDateDesc(request.getSeriesId());
        int consecutiveLow = 0;
        for (ReaderPoll p : recentPolls) {
            if (p.getRankPosition() != null && p.getRankPosition() > 20) {
                consecutiveLow++;
            } else {
                break;
            }
        }
        series.setCancellationRisk(consecutiveLow >= 3);
        seriesRepository.save(series);

        log.info("Poll data entered: seriesId={}, autoRank={}, votes={}, consecutiveLow={}",
                request.getSeriesId(), autoRank, request.getVoteCount(), consecutiveLow);

        return new ReaderPollDTO(
                poll.getId(), poll.getSeriesId(), poll.getPollPeriod(),
                poll.getPollYear(), poll.getRankPosition(), poll.getVoteCount(),
                poll.getPollDate().toString()
        );
    }

    // ── Editorial Decision ────────────────────────────────────────
    @Transactional
    /**
     * @deprecated Quyết định 1 người không qua bỏ phiếu — không công bằng, dễ rủi ro.
     * Dùng {@link #createProposal} + {@link #castEditorialVote} thay thế (cần Board vote tập thể).
     * Giữ lại method này để không breaking change nếu frontend còn gọi, nhưng KHÔNG nên dùng cho code mới.
     */
    @Deprecated
    public SeriesDTO makeDecision(EditorialDecisionRequest request, String boardMemberId) {
        Series series = seriesRepository.findById(request.getSeriesId())
                .orElseThrow(() -> new RuntimeException("Series not found"));

        switch (request.getActionType()) {
            case "cancel" -> {
                series.setStatus(Series.SeriesStatus.cancelled);
                series.setCancellationRisk(false);
            }
            case "change_schedule" -> {
                if (request.getNewSchedule() != null) {
                    try {
                        series.setPublishSchedule(Series.PublishSchedule.valueOf(request.getNewSchedule()));
                        series.setPublishScheduleId(
                                lookupResolverService.resolvePublishScheduleId(series.getPublishSchedule()));
                    } catch (IllegalArgumentException ignored) {}
                }
            }
            case "hiatus" -> series.setStatus(Series.SeriesStatus.on_hiatus);
            case "reinstate" -> {
                series.setStatus(Series.SeriesStatus.publishing);
                series.setCancellationRisk(false);
            }
        }

        series = seriesRepository.save(series);

        log.info("Editorial decision made: seriesId={}, action={}, by={}",
                request.getSeriesId(), request.getActionType(), boardMemberId);

        return new SeriesDTO(
                series.getId(), series.getTitle(), series.getGenre(),
                series.getSynopsis(), series.getCoverUrl(),
                series.getMangakaId(), series.getEditorId(),
                series.getStatus().name(),
                series.getPublishSchedule() != null ? series.getPublishSchedule().name() : null,
                series.getCreatedAt() != null ? series.getCreatedAt().toString() : null,
                series.getUpdatedAt() != null ? series.getUpdatedAt().toString() : null
        );
    }

    // ── Editorial Proposal — quyết định tập thể của Board (thay makeDecision) ──

    /**
     * Board member đề xuất quyết định (cancel/hiatus/reinstate/change_schedule).
     * KHÔNG tự áp dụng ngay — phải chờ đủ Board vote mới chốt (xem castEditorialVote).
     */
    @Transactional
    public EditorialProposalDTO createProposal(CreateProposalRequest request, String boardMemberId) {
        Series series = seriesRepository.findById(request.getSeriesId())
                .orElseThrow(() -> new RuntimeException("Series not found"));

        // Không tạo đề xuất trùng khi đang có 1 proposal voting cho cùng series
        boolean hasActiveProposal = !editorialProposalRepository
                .findBySeriesIdAndStatus(request.getSeriesId(), EditorialProposal.ProposalStatus.voting)
                .isEmpty();
        if (hasActiveProposal) {
            throw new RuntimeException("Series này đang có đề xuất chờ Board bỏ phiếu, vui lòng chờ kết quả");
        }

        EditorialProposal proposal = new EditorialProposal();
        proposal.setSeriesId(request.getSeriesId());
        proposal.setActionType(request.getActionType());
        proposal.setNewSchedule(request.getNewSchedule());
        proposal.setProposedBy(boardMemberId);
        proposal.setReason(request.getReason());
        proposal = editorialProposalRepository.save(proposal);

        log.info("Editorial proposal created: seriesId={}, action={}, by={}",
                request.getSeriesId(), request.getActionType(), boardMemberId);

        return mapProposalToDTO(proposal, series, boardMemberId);
    }

    /**
     * Mỗi Board member bỏ phiếu cho 1 đề xuất. Đủ quorum (3 vote) thì tự động chốt
     * và áp dụng quyết định lên Series (giống pattern castVote() cho submission).
     */
    @Transactional
    public EditorialProposalDTO castEditorialVote(EditorialVoteRequest request, String boardMemberId) {
        EditorialProposal proposal = editorialProposalRepository.findById(request.getProposalId())
                .orElseThrow(() -> new RuntimeException("Proposal not found"));

        if (proposal.getStatus() != EditorialProposal.ProposalStatus.voting) {
            throw new RuntimeException("Đề xuất này đã được quyết định");
        }
        if (editorialVoteRepository.existsByProposalIdAndVoterId(request.getProposalId(), boardMemberId)) {
            throw new RuntimeException("Bạn đã bỏ phiếu cho đề xuất này rồi");
        }

        EditorialVote vote = new EditorialVote();
        vote.setProposalId(request.getProposalId());
        vote.setVoterId(boardMemberId);
        vote.setComment(request.getComment());
        try {
            vote.setVote(EditorialVote.VoteChoice.valueOf(request.getDecision()));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("decision phải là yes, no hoặc abstain");
        }
        editorialVoteRepository.save(vote);

        switch (request.getDecision()) {
            case "yes" -> proposal.setVoteYes(proposal.getVoteYes() + 1);
            case "no" -> proposal.setVoteNo(proposal.getVoteNo() + 1);
            default -> proposal.setVoteAbstain(proposal.getVoteAbstain() + 1);
        }

        // Quorum cố định 3 — giống pattern castVote() submission (có thể đổi thành % tổng board member active)
        int totalVotes = proposal.getVoteYes() + proposal.getVoteNo() + proposal.getVoteAbstain();
        final int QUORUM = 3;

        if (totalVotes >= QUORUM) {
            if (proposal.getVoteYes() > proposal.getVoteNo()) {
                proposal.setStatus(EditorialProposal.ProposalStatus.approved);
                proposal.setDecidedAt(LocalDateTime.now());
                applyDecisionToSeries(proposal);
            } else {
                proposal.setStatus(EditorialProposal.ProposalStatus.rejected);
                proposal.setDecidedAt(LocalDateTime.now());
            }
        }
        proposal = editorialProposalRepository.save(proposal);

        Series series = seriesRepository.findById(proposal.getSeriesId()).orElse(null);
        log.info("Editorial vote cast: proposalId={}, decision={}, totalVotes={}, status={}",
                request.getProposalId(), request.getDecision(), totalVotes, proposal.getStatus());

        return mapProposalToDTO(proposal, series, boardMemberId);
    }

    /** Danh sách đề xuất đang chờ Board bỏ phiếu */
    public List<EditorialProposalDTO> getActiveProposals(String boardMemberId) {
        return editorialProposalRepository
                .findByStatusOrderByCreatedAtDesc(EditorialProposal.ProposalStatus.voting)
                .stream()
                .map(p -> {
                    Series series = seriesRepository.findById(p.getSeriesId()).orElse(null);
                    return mapProposalToDTO(p, series, boardMemberId);
                })
                .collect(Collectors.toList());
    }

    /** Thực thi quyết định lên Series khi proposal được approved — tái dùng logic switch-case của makeDecision cũ */
    private void applyDecisionToSeries(EditorialProposal proposal) {
        Series series = seriesRepository.findById(proposal.getSeriesId())
                .orElseThrow(() -> new RuntimeException("Series not found"));

        switch (proposal.getActionType()) {
            case "cancel" -> {
                series.setStatus(Series.SeriesStatus.cancelled);
                series.setCancellationRisk(false);
            }
            case "hiatus" -> series.setStatus(Series.SeriesStatus.on_hiatus);
            case "reinstate" -> {
                series.setStatus(Series.SeriesStatus.publishing);
                series.setCancellationRisk(false);
            }
            case "change_schedule" -> {
                if (proposal.getNewSchedule() != null) {
                    try {
                        series.setPublishSchedule(Series.PublishSchedule.valueOf(proposal.getNewSchedule()));
                        series.setPublishScheduleId(
                                lookupResolverService.resolvePublishScheduleId(series.getPublishSchedule()));
                    } catch (IllegalArgumentException ignored) {}
                }
            }
        }
        seriesRepository.save(series);

        // Thông báo cho Mangaka khi series bị cancel/hiatus
        if (proposal.getActionType().equals("cancel") || proposal.getActionType().equals("hiatus")) {
            Notification notification = new Notification();
            notification.setUserId(series.getMangakaId());
            notification.setType(Notification.NotificationType.series_at_risk);
            notification.setNotificationTypeId(
                    lookupResolverService.resolveNotificationTypeId(Notification.NotificationType.series_at_risk));
            notification.setReferenceId(series.getId());
            notification.setReferenceType("series");
            notification.setMessage(String.format(
                    "Series \"%s\" đã được Hội đồng biên tập quyết định: %s",
                    series.getTitle(),
                    proposal.getActionType().equals("cancel") ? "hủy bỏ" : "tạm ngưng"
            ));
            notificationRepository.save(notification);
        }
    }

    private EditorialProposalDTO mapProposalToDTO(EditorialProposal proposal, Series series, String currentUserId) {
        String seriesTitle = series != null ? series.getTitle() : "";
        String proposedByName = userRepository.findById(proposal.getProposedBy())
                .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                .orElse("Unknown");
        boolean hasVoted = editorialVoteRepository
                .existsByProposalIdAndVoterId(proposal.getId(), currentUserId);

        return new EditorialProposalDTO(
                proposal.getId(),
                proposal.getSeriesId(),
                seriesTitle,
                proposal.getActionType(),
                proposal.getNewSchedule(),
                proposal.getReason(),
                proposedByName,
                proposal.getVoteYes(),
                proposal.getVoteNo(),
                proposal.getVoteAbstain(),
                proposal.getStatus().name(),
                hasVoted,
                proposal.getCreatedAt() != null ? proposal.getCreatedAt().toString() : null
        );
    }

    // ── Xem rankings ─────────────────────────────────────────────
    public List<SeriesRankingDTO> getAllRankings() {
        return seriesRepository.findByStatusIn(
                List.of(Series.SeriesStatus.publishing, Series.SeriesStatus.approved)
        ).stream().map(series -> {
            ReaderPoll latest = readerPollRepository
                    .findTopBySeriesIdOrderByPollDateDesc(series.getId()).orElse(null);
            ReaderPoll previous = latest != null
                    ? readerPollRepository.findTopBySeriesIdAndPollDateBeforeOrderByPollDateDesc(
                            series.getId(), latest.getPollDate()).orElse(null)
                    : null;

            int curr = latest != null ? latest.getRankPosition() : 0;
            int prev = previous != null ? previous.getRankPosition() : curr;
            String trend = curr < prev ? "up" : curr > prev ? "down" : "stable";

            // Đếm liên tiếp gần nhất, không phải tổng toàn bộ lịch sử
            List<ReaderPoll> recent = readerPollRepository
                    .findTop5BySeriesIdOrderByPollDateDesc(series.getId());
            int consecutiveLow = 0;
            for (ReaderPoll p : recent) {
                if (p.getRankPosition() != null && p.getRankPosition() > 20) consecutiveLow++;
                else break;
            }

            Double rs = latest != null ? latest.getReaderScore() : null;
            Integer rv = latest != null ? latest.getReaderVoteCount() : null;
            Double ws = null;
            if (rs != null) {
                double v = rv != null ? rv : 0;
                double R = (v * rs + 20 * 6.8) / (v + 20);
                ws = Math.round(R * 100.0) / 100.0;
            }
            return new SeriesRankingDTO(
                    series.getId(), series.getTitle(), curr, prev, trend,
                    latest != null ? latest.getVoteCount() : 0,
                    previous != null ? previous.getVoteCount() : 0,
                    series.getCancellationRisk() != null && series.getCancellationRisk(),
                    consecutiveLow,
                    latest != null ? latest.getPollDate().toString() : null,
                    rs, rv, ws
            );
        }).sorted(Comparator.comparingInt(r -> r.getCurrentRank() == 0 ? 999 : r.getCurrentRank()))
        .collect(Collectors.toList());
    }
}