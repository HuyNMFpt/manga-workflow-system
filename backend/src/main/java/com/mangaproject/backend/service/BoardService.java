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
    private final ManuscriptPageRepository manuscriptPageRepository;
    private final ReaderPollRepository readerPollRepository;
    private final UserRepository userRepository;
    private final BoardVoteRepository boardVoteRepository;
    private final NotificationRepository notificationRepository;
    private final LookupResolverService lookupResolverService;
    private final EditorialProposalRepository editorialProposalRepository;
    private final EditorialVoteRepository editorialVoteRepository;
    private final com.mangaproject.backend.repository.ChapterRepository chapterRepository;

    // 20% cuối bảng xếp hạng bị tính là "kỳ thấp" — dễ điều chỉnh sau này
    private static final double AT_RISK_BOTTOM_PCT = 0.2;

    // ── Dashboard stats ──────────────────────────────────────────
    public BoardStatsDTO getStats() {
        // Chờ vote: chỉ đếm submission đã được Editor nộp lên Board (voting)
        // Bỏ pending — pending là Mangaka nộp cho Editor, chưa qua Board
        List<Submission> pendingOrVoting = new ArrayList<>();
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
                            && s.getStatus() != Series.SeriesStatus.cancelled
                            && s.getStatus() != Series.SeriesStatus.rejected;
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

        return new BoardStatsDTO(pendingVotes, totalActive, atRisk, decisionsThisMonth,
                // TODO 2: proposals đã thông qua tháng này
                editorialProposalRepository.countByStatusAndDecidedAtAfter(
                        EditorialProposal.ProposalStatus.approved, startOfMonth),
                // TODO 2: chapters được xuất bản tháng này
                chapterRepository.countPublishedAfter(startOfMonth.toLocalDate()));
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
        // CHỈ lấy voting — Editor đã nộp lên Board
        // Bỏ pending — pending là Mangaka nộp cho Editor, Board không được thấy
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

        // Filter: chỉ hiện series đang ở trạng thái submitted (Editor đã nộp lên Board)
        // Bỏ series chưa được Editor submit, đã publishing, cancelled, rejected
        List<Submission> submissions = latestBySeriesId.entrySet().stream()
                .filter(e -> {
                    Series s = seriesMap.get(e.getKey());
                    return s != null && s.getStatus() == Series.SeriesStatus.submitted;
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

            // Map trang bản thảo cho Board xem
            List<ManuscriptPageDTO> msPages = manuscriptPageRepository
                    .findByManuscriptIdOrderByPageNumberAsc(sub.getManuscriptId())
                    .stream()
                    .map(p -> new ManuscriptPageDTO(
                            p.getId(), p.getManuscriptId(), p.getPageNumber(),
                            p.getImageUrl(), p.getThumbnailUrl(), p.getNotes()))
                    .collect(java.util.stream.Collectors.toList());
            dto.setManuscriptPages(msPages);

            // coverUrl từ series — frontend VotingQueue card
            if (series != null) dto.setCoverUrl(series.getCoverUrl());
            // submittedAt — thời điểm Editor nộp lên Board
            dto.setSubmittedAt(sub.getCreatedAt() != null ? sub.getCreatedAt().toString() : null);

            return dto;
        }).collect(Collectors.toList());
    }

    // ── Vote ─────────────────────────────────────────────────────
    @Transactional
    public SubmissionDTO castVote(VoteRequest request, String boardMemberId) {
        User voter = userRepository.findById(boardMemberId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Board trưởng không vote tư vấn — dùng /board/decide
        if (voter.isBoardChair()) {
            throw new RuntimeException("Board trưởng dùng chức năng Quyết định, không vote tư vấn");
        }

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
        boardVote.setSchedule(request.getSchedule()); // lịch xuất bản member đề xuất
        switch (request.getDecision()) {
            case "approve"  -> boardVote.setVote(BoardVote.VoteChoice.yes);
            case "reject"   -> boardVote.setVote(BoardVote.VoteChoice.no);
            default         -> boardVote.setVote(BoardVote.VoteChoice.abstain);
        }
        boardVoteRepository.save(boardVote);

        submission.setStatus(Submission.SubmissionStatus.voting);
        switch (request.getDecision()) {
            case "approve" -> submission.setVoteYes(submission.getVoteYes() + 1);
            case "reject"  -> submission.setVoteNo(submission.getVoteNo() + 1);
            default        -> submission.setVoteAbstain(submission.getVoteAbstain() + 1);
        }

        // Khi đủ 2 ý kiến tư vấn → notify Board trưởng cần quyết định
        int totalVotes = submission.getVoteYes() + submission.getVoteNo() + submission.getVoteAbstain();
        if (totalVotes >= 2) {
            Manuscript msForNotif = manuscriptRepository.findById(submission.getManuscriptId()).orElse(null);
            final String seriesTitleForNotif = msForNotif != null
                    ? seriesRepository.findById(msForNotif.getSeriesId()).map(Series::getTitle).orElse("") : "";
            final String submissionIdForNotif = submission.getId();
            userRepository.findByIsBoardChairTrue().ifPresent(chair -> {
                Notification notif = new Notification();
                notif.setUserId(chair.getId());
                notif.setType(Notification.NotificationType.submission_result);
                notif.setNotificationTypeId(lookupResolverService.resolveNotificationTypeId(
                        Notification.NotificationType.submission_result));
                notif.setMessage("Đã đủ 2 ý kiến tư vấn cho series \"" + seriesTitleForNotif
                        + "\" — chờ quyết định của bạn");
                notif.setReferenceId(submissionIdForNotif);
                notif.setReferenceType("submission");
                notificationRepository.save(notif);
            });
        }

        submission = submissionRepository.save(submission);

        // Build response DTO
        Manuscript msForDto = manuscriptRepository.findById(submission.getManuscriptId()).orElse(null);
        String resolvedSeriesId = msForDto != null ? msForDto.getSeriesId() : "";
        String resolvedSeriesTitle = "";
        if (msForDto != null) {
            resolvedSeriesTitle = seriesRepository.findById(msForDto.getSeriesId())
                    .map(Series::getTitle).orElse("");
        }

        SubmissionDTO dto = new SubmissionDTO();
        dto.setId(submission.getId());
        dto.setManuscriptId(submission.getManuscriptId());
        dto.setSeriesId(resolvedSeriesId);
        dto.setSeriesTitle(resolvedSeriesTitle);
        dto.setSubmittedBy(submission.getSubmittedBy());
        dto.setSubmissionRound(submission.getSubmissionRound());
        dto.setCoverLetter(submission.getCoverLetter());
        dto.setStatus(submission.getStatus().name());
        dto.setVoteYes(submission.getVoteYes());
        dto.setVoteNo(submission.getVoteNo());
        dto.setVoteAbstain(submission.getVoteAbstain());
        dto.setVotingDeadline(submission.getVotingDeadline() != null ? submission.getVotingDeadline().toString() : null);
        dto.setCreatedAt(submission.getCreatedAt() != null ? submission.getCreatedAt().toString() : null);
        // Thêm coverUrl từ series
        if (msForDto != null) {
            seriesRepository.findById(msForDto.getSeriesId())
                    .ifPresent(s -> dto.setCoverUrl(s.getCoverUrl()));
        }
        return dto;
    }

    // ── Board trưởng ra quyết định cuối ──────────────────────────
    @Transactional
    public void decideSubmission(DecideRequest request, String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!user.isBoardChair()) {
            throw new RuntimeException("Chỉ Board trưởng mới được đưa ra quyết định");
        }

        Submission submission = submissionRepository.findById(request.getSubmissionId())
                .orElseThrow(() -> new RuntimeException("Submission not found"));
        if (submission.getDecidedAt() != null) {
            throw new RuntimeException("Submission này đã được quyết định rồi");
        }

        long totalVotes = submission.getVoteYes() + submission.getVoteNo() + submission.getVoteAbstain();
        if (totalVotes < 2) {
            throw new RuntimeException("Cần đủ 2 ý kiến tư vấn trước khi quyết định (hiện có " + totalVotes + ")");
        }

        Manuscript ms = manuscriptRepository.findById(submission.getManuscriptId())
                .orElseThrow(() -> new RuntimeException("Manuscript not found"));
        Series series = seriesRepository.findById(ms.getSeriesId())
                .orElseThrow(() -> new RuntimeException("Series not found"));

        if ("approve".equals(request.getDecision())) {
            submission.setStatus(Submission.SubmissionStatus.approved);
            series.setStatus(Series.SeriesStatus.publishing);
            series.setApprovedAt(LocalDateTime.now());
            if (request.getPublishSchedule() != null) {
                try {
                    series.setPublishSchedule(Series.PublishSchedule.valueOf(request.getPublishSchedule()));
                    series.setPublishScheduleId(
                            lookupResolverService.resolvePublishScheduleId(series.getPublishSchedule()));
                } catch (IllegalArgumentException ignored) {}
            }
            if (request.getPublishStartDate() != null && !request.getPublishStartDate().isBlank()) {
                try {
                    series.setPublishStartDate(java.time.LocalDate.parse(request.getPublishStartDate()));
                } catch (Exception ignored) {}
            }
            ms.setStatus(Manuscript.ManuscriptStatus.publishing);

            // Notification board_approved cho Mangaka
            Notification mangakaNotif = new Notification();
            mangakaNotif.setUserId(series.getMangakaId());
            mangakaNotif.setType(Notification.NotificationType.board_approved);
            mangakaNotif.setNotificationTypeId(lookupResolverService.resolveNotificationTypeId(
                    Notification.NotificationType.board_approved));
            mangakaNotif.setReferenceId(series.getId());
            mangakaNotif.setReferenceType("series");
            mangakaNotif.setMessage(String.format(
                    "🎉 Series \"%s\" đã được Board duyệt xuất bản!", series.getTitle()));
            notificationRepository.save(mangakaNotif);

            // Notification board_approved cho Editor (nếu có)
            if (series.getEditorId() != null) {
                Notification editorNotif = new Notification();
                editorNotif.setUserId(series.getEditorId());
                editorNotif.setType(Notification.NotificationType.board_approved);
                editorNotif.setNotificationTypeId(lookupResolverService.resolveNotificationTypeId(
                        Notification.NotificationType.board_approved));
                editorNotif.setReferenceId(series.getId());
                editorNotif.setReferenceType("series");
                editorNotif.setMessage(String.format(
                        "🎉 Series \"%s\" đã được Board duyệt xuất bản!", series.getTitle()));
                notificationRepository.save(editorNotif);
            }
        } else {
            submission.setStatus(Submission.SubmissionStatus.rejected);
            if (series.getApprovedAt() == null) {
                series.setStatus(Series.SeriesStatus.rejected);
            } else {
                series.setStatus(Series.SeriesStatus.cancelled);
            }
            ms.setStatus(Manuscript.ManuscriptStatus.rejected);

            // Notification board_rejected cho Mangaka
            Notification rejectNotif = new Notification();
            rejectNotif.setUserId(series.getMangakaId());
            rejectNotif.setType(Notification.NotificationType.board_rejected);
            rejectNotif.setNotificationTypeId(lookupResolverService.resolveNotificationTypeId(
                    Notification.NotificationType.board_rejected));
            rejectNotif.setReferenceId(series.getId());
            rejectNotif.setReferenceType("series");
            rejectNotif.setMessage(String.format(
                    "Series \"%s\" đã bị Board từ chối. Bạn có thể chỉnh sửa và nộp lại.",
                    series.getTitle()));
            notificationRepository.save(rejectNotif);
        }

        submission.setDecidedAt(LocalDateTime.now());
        submissionRepository.save(submission);
        manuscriptRepository.save(ms);
        seriesRepository.save(series);

        log.info("Board chair decided: submissionId={}, decision={}, userId={}",
                request.getSubmissionId(), request.getDecision(), userId);
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

        // Chặn cứng: series này đã có dữ liệu cho đúng kỳ/năm này rồi thì báo lỗi,
        // không tự ý ghi đè. Muốn sửa phải dùng PUT /rankings/{id}.
        if (readerPollRepository.existsBySeriesIdAndPollPeriodAndPollYear(
                request.getSeriesId(), request.getPollPeriod(), request.getPollYear())) {
            throw new RuntimeException(String.format(
                "Series \"%s\" đã có dữ liệu cho kỳ %d/%d rồi. Dùng nút \"Sửa\" để chỉnh lại thay vì nhập mới.",
                series.getTitle(), request.getPollPeriod(), request.getPollYear()));
        }

        // #4 — Tự tính rankPosition từ voteCount trong cùng kỳ
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

        // #6 — Check cancellation risk: thuộc 20% cuối bảng LIÊN TIẾP 3 kỳ gần nhất
        // Ngưỡng động: không hardcode > 20 mà tính theo tổng series publishing
        // Ví dụ: 5 series → threshold=1 → hạng > 4 bị tính thấp
        int totalPublishing = seriesRepository.countByStatus(Series.SeriesStatus.publishing);
        int atRiskThreshold = Math.max(1, (int) Math.ceil(totalPublishing * AT_RISK_BOTTOM_PCT));

        // Edge case: chỉ 1 series publishing → không xét at-risk (không có đối thủ để so sánh)
        if (totalPublishing <= 1) {
            series.setCancellationRisk(false);
        } else {
            List<ReaderPoll> recentPolls = readerPollRepository
                    .findTop5BySeriesIdOrderByPollDateDescCreatedAtDesc(request.getSeriesId());
            int consecutiveLow = 0;
            for (ReaderPoll p : recentPolls) {
                if (p.getRankPosition() != null
                        && p.getRankPosition() > (totalPublishing - atRiskThreshold)) {
                    consecutiveLow++;
                } else {
                    break;
                }
            }
            series.setCancellationRisk(consecutiveLow >= 3);
            log.info("at-risk check: totalPublishing={}, threshold={}, consecutiveLow={}",
                    totalPublishing, atRiskThreshold, consecutiveLow);
        }
        seriesRepository.save(series);

        // 3.2 — Notification poll_updated cho Mangaka
        Notification pollNotif = new Notification();
        pollNotif.setUserId(series.getMangakaId());
        pollNotif.setType(Notification.NotificationType.poll_updated);
        pollNotif.setNotificationTypeId(
                lookupResolverService.resolveNotificationTypeId(Notification.NotificationType.poll_updated));
        pollNotif.setReferenceId(series.getId());
        pollNotif.setReferenceType("series");
        pollNotif.setMessage(String.format(
                "Kết quả poll mới cho \"%s\": hạng %d (kỳ %s/%d, %d phiếu)",
                series.getTitle(), autoRank, request.getPollPeriod(), request.getPollYear(), request.getVoteCount()
        ));
        notificationRepository.save(pollNotif);

        log.info("Poll data entered: seriesId={}, autoRank={}, votes={}",
                request.getSeriesId(), autoRank, request.getVoteCount());

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
    // ── Mục 2: Sửa poll đã nhập ──────────────────────────────────────
    public ReaderPollDTO updatePollData(String pollId, PollInputRequest request, String boardMemberId) {
        ReaderPoll poll = readerPollRepository.findById(pollId)
                .orElseThrow(() -> new RuntimeException("Poll không tồn tại"));

        // Chỉ người đã nhập hoặc board chair mới được sửa
        User editor = userRepository.findById(boardMemberId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!poll.getEnteredBy().equals(boardMemberId) && !editor.isBoardChair()) {
            throw new RuntimeException("Chỉ người nhập hoặc Board trưởng mới được sửa poll này");
        }

        // Tính lại autoRank từ voteCount mới (bỏ poll hiện tại khỏi tính toán)
        int autoRank = readerPollRepository.countByPollPeriodAndPollYearAndVoteCountGreaterThan(
                request.getPollPeriod() != null ? request.getPollPeriod() : poll.getPollPeriod(),
                request.getPollYear()   != null ? request.getPollYear()   : poll.getPollYear(),
                request.getVoteCount()  != null ? request.getVoteCount()  : poll.getVoteCount()
        ) + 1;

        if (request.getVoteCount()      != null) poll.setVoteCount(request.getVoteCount());
        if (request.getPollPeriod()     != null) poll.setPollPeriod(request.getPollPeriod());
        if (request.getPollYear()       != null) poll.setPollYear(request.getPollYear());
        if (request.getReaderScore()    != null) poll.setReaderScore(request.getReaderScore());
        if (request.getReaderVoteCount()!= null) poll.setReaderVoteCount(request.getReaderVoteCount());
        if (request.getNotes()          != null) poll.setNotes(request.getNotes());
        if (request.getPollDate()       != null) {
            try { poll.setPollDate(java.time.LocalDate.parse(request.getPollDate())); }
            catch (Exception ignored) {}
        }
        poll.setRankPosition(autoRank);
        poll = readerPollRepository.save(poll);

        // Cập nhật current_rank series nếu trùng kỳ mới nhất
        Series series = seriesRepository.findById(poll.getSeriesId()).orElse(null);
        if (series != null) {
            series.setPreviousRank(series.getCurrentRank());
            series.setCurrentRank(autoRank);
            seriesRepository.save(series);
        }

        log.info("Poll updated: id={}, by={}", pollId, boardMemberId);
        return new ReaderPollDTO(poll.getId(), poll.getSeriesId(),
                poll.getPollPeriod(), poll.getPollYear(),
                poll.getRankPosition(), poll.getVoteCount(),
                poll.getPollDate() != null ? poll.getPollDate().toString() : null);
    }

    // ── Mục 3: Xóa poll nhầm ─────────────────────────────────────────
    public void deletePollData(String pollId, String boardMemberId) {
        ReaderPoll poll = readerPollRepository.findById(pollId)
                .orElseThrow(() -> new RuntimeException("Poll không tồn tại"));

        User deleter = userRepository.findById(boardMemberId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!poll.getEnteredBy().equals(boardMemberId) && !deleter.isBoardChair()) {
            throw new RuntimeException("Chỉ người nhập hoặc Board trưởng mới được xóa poll này");
        }

        readerPollRepository.delete(poll);
        log.info("Poll deleted: id={}, by={}", pollId, boardMemberId);
    }


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

    // ── Board Vote Details — xem chi tiết phiếu bầu ──────────────

    public List<BoardVoteDetailDTO> getVoteDetails(String submissionId) {
        return boardVoteRepository.findBySubmissionIdOrderByVotedAtAsc(submissionId)
                .stream()
                .map(v -> {
                    String name = userRepository.findById(v.getVoterId())
                            .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                            .orElse("Unknown");
                    return new BoardVoteDetailDTO(
                            v.getVoterId(), name,
                            v.getVote().name(),
                            v.getComment(),
                            v.getSchedule(),
                            v.getVotedAt() != null ? v.getVotedAt().toString() : null
                    );
                })
                .collect(Collectors.toList());
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

        // Chỉ cho phép tạo proposal cho series đang publishing hoặc on_hiatus
        // draft/submitted/approved/rejected/cancelled không được tạo proposal
        if (series.getStatus() != Series.SeriesStatus.publishing
                && series.getStatus() != Series.SeriesStatus.on_hiatus) {
            throw new RuntimeException(
                "Chỉ có thể tạo đề xuất cho series đang xuất bản hoặc tạm ngưng. "
                + "Trạng thái hiện tại: " + series.getStatus().name());
        }

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
        proposal.setVotingDeadline(LocalDateTime.now().plusDays(3)); // 3 ngày để vote
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

        // Quorum động: 60% board member active, tối thiểu 2
        int activeBoardMembers = (int) userRepository.findByRole_NameAndIsActiveTrue("board_member").size();
        final int QUORUM = Math.max(2, (int) Math.ceil(activeBoardMembers * 0.6));
        int totalVotes = proposal.getVoteYes() + proposal.getVoteNo() + proposal.getVoteAbstain();

        // Đóng sớm khi TẤT CẢ board member đã vote (100% tham gia, không ai pending)
        // — không cần chờ hết hạn, kết quả đã chắc chắn
        if (totalVotes >= activeBoardMembers) {
            if (proposal.getVoteYes() > proposal.getVoteNo()) {
                proposal.setStatus(EditorialProposal.ProposalStatus.approved);
                proposal.setDecidedAt(LocalDateTime.now());
                editorialProposalRepository.save(proposal);
                applyDecisionToSeries(proposal);
                log.info("Editorial proposal CLOSED EARLY (full participation) APPROVED: id={}", proposal.getId());
            } else {
                proposal.setStatus(EditorialProposal.ProposalStatus.rejected);
                proposal.setDecidedAt(LocalDateTime.now());
                editorialProposalRepository.save(proposal);
                log.info("Editorial proposal CLOSED EARLY (full participation) REJECTED: id={}", proposal.getId());
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
    public void applyDecisionToSeries(EditorialProposal proposal) {
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

        // 3.3 — Notification series_cancelled khi cancel
        if (proposal.getActionType().equals("cancel")) {
            Notification cancelNotif = new Notification();
            cancelNotif.setUserId(series.getMangakaId());
            cancelNotif.setType(Notification.NotificationType.series_cancelled);
            cancelNotif.setNotificationTypeId(
                    lookupResolverService.resolveNotificationTypeId(Notification.NotificationType.series_cancelled));
            cancelNotif.setReferenceId(series.getId());
            cancelNotif.setReferenceType("series");
            cancelNotif.setMessage(String.format(
                    "Series \"%s\" đã bị Hội đồng biên tập hủy bỏ.",
                    series.getTitle()
            ));
            notificationRepository.save(cancelNotif);
        }
        // Notification series_hiatus khi hiatus
        if (proposal.getActionType().equals("hiatus")) {
            Notification hiatusNotif = new Notification();
            hiatusNotif.setUserId(series.getMangakaId());
            hiatusNotif.setType(Notification.NotificationType.series_hiatus);
            hiatusNotif.setNotificationTypeId(
                    lookupResolverService.resolveNotificationTypeId(Notification.NotificationType.series_hiatus));
            hiatusNotif.setReferenceId(series.getId());
            hiatusNotif.setReferenceType("series");
            hiatusNotif.setMessage(String.format(
                    "Series \"%s\" đã được Hội đồng biên tập quyết định: tạm ngưng.",
                    series.getTitle()
            ));
            notificationRepository.save(hiatusNotif);
        }
    }

    // TODO 1: Lịch sử proposals đã quyết định
    public List<EditorialProposalDTO> getProposalHistory(String boardMemberId) {
        return editorialProposalRepository
                .findByStatusInOrderByDecidedAtDesc(
                        List.of(EditorialProposal.ProposalStatus.approved,
                                EditorialProposal.ProposalStatus.rejected))
                .stream()
                .map(p -> {
                    Series series = seriesRepository.findById(p.getSeriesId()).orElse(null);
                    return mapProposalToDTO(p, series, boardMemberId);
                })
                .collect(Collectors.toList());
    }

    // TODO 3: Chi tiết phiếu bầu của 1 editorial proposal
    public com.mangaproject.backend.dto.ProposalVoteDetailsDTO getEditorialVoteDetails(String proposalId) {
        EditorialProposal proposal = editorialProposalRepository.findById(proposalId)
                .orElseThrow(() -> new RuntimeException("Proposal not found"));

        // Danh sách đã vote
        List<com.mangaproject.backend.dto.EditorialVoteDetailDTO> voted =
                editorialVoteRepository.findByProposalIdOrderByVotedAtAsc(proposalId)
                .stream()
                .map(v -> {
                    String voterName = userRepository.findById(v.getVoterId())
                            .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                            .orElse("Unknown");
                    return new com.mangaproject.backend.dto.EditorialVoteDetailDTO(
                            v.getVoterId(), voterName,
                            v.getVote().name(),
                            v.getComment(),
                            v.getVotedAt() != null ? v.getVotedAt().toString() : null);
                })
                .collect(Collectors.toList());

        // Danh sách chưa vote — tất cả board_member active KỂ CẢ Board trưởng
        // Test case: Board 3 người (2 member + 1 trưởng), chưa ai vote → pending hiện đủ cả 3
        java.util.Set<String> votedIds = voted.stream()
                .map(com.mangaproject.backend.dto.EditorialVoteDetailDTO::getVoterId)
                .collect(java.util.stream.Collectors.toSet());

        List<com.mangaproject.backend.dto.EditorialVoteDetailDTO> pending =
                userRepository.findByRole_NameAndIsActiveTrue("board_member")
                .stream()
                .filter(u -> !votedIds.contains(u.getId()))
                .map(u -> new com.mangaproject.backend.dto.EditorialVoteDetailDTO(
                        u.getId(),
                        u.getName() != null ? u.getName() : u.getUsername(),
                        null, null, null))
                .collect(Collectors.toList());

        // Quorum động
        int activeBoardMembers = (int) userRepository.findByRole_NameAndIsActiveTrue("board_member").size();
        int quorum = Math.max(2, (int) Math.ceil(activeBoardMembers * 0.6));

        return new com.mangaproject.backend.dto.ProposalVoteDetailsDTO(
                voted, pending, quorum, voted.size());
    }

    private EditorialProposalDTO mapProposalToDTO(EditorialProposal proposal, Series series, String currentUserId) {
        String seriesTitle = series != null ? series.getTitle() : "";
        String proposedByName = userRepository.findById(proposal.getProposedBy())
                .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                .orElse("Unknown");
        boolean hasVoted = editorialVoteRepository
                .existsByProposalIdAndVoterId(proposal.getId(), currentUserId);

        int totalVotes = proposal.getVoteYes() + proposal.getVoteNo() + proposal.getVoteAbstain();

        // Quorum động: số board_member active (tối thiểu 2)
        int activeBoardMembers = (int) userRepository.findByRole_NameAndIsActiveTrue("board_member").size();
        int quorum = Math.max(2, (int) Math.ceil(activeBoardMembers * 0.6)); // 60% board

        EditorialProposalDTO dto = new EditorialProposalDTO();
        dto.setId(proposal.getId());
        dto.setSeriesId(proposal.getSeriesId());
        dto.setSeriesTitle(seriesTitle);
        dto.setActionType(proposal.getActionType());
        dto.setNewSchedule(proposal.getNewSchedule());
        dto.setReason(proposal.getReason());
        dto.setProposedByName(proposedByName);
        dto.setVoteYes(proposal.getVoteYes());
        dto.setVoteNo(proposal.getVoteNo());
        dto.setVoteAbstain(proposal.getVoteAbstain());
        dto.setStatus(proposal.getStatus().name());
        dto.setHasVoted(hasVoted);
        dto.setCreatedAt(proposal.getCreatedAt() != null ? proposal.getCreatedAt().toString() : null);
        dto.setDecidedAt(proposal.getDecidedAt() != null ? proposal.getDecidedAt().toString() : null);
        dto.setTotalVotes(totalVotes);
        dto.setQuorum(quorum);
        dto.setVotingDeadline(proposal.getVotingDeadline() != null ? proposal.getVotingDeadline().toString() : null);
        return dto;
    }

    // ── Series on_hiatus cần Board đề xuất ───────────────────────
    public List<SeriesRankingDTO> getHiatusSeries() {
        // Dùng lại getAllRankings() đã tính đủ fields, filter chỉ on_hiatus
        return getAllRankings().stream()
                .filter(r -> "on_hiatus".equals(r.getSeriesStatus()))
                .collect(Collectors.toList());
    }

    // ── Xem rankings ─────────────────────────────────────────────
    public List<SeriesRankingDTO> getAllRankings() {
        return seriesRepository.findByStatusIn(
                        List.of(Series.SeriesStatus.publishing, Series.SeriesStatus.approved)
                ).stream().map(series -> {
                    ReaderPoll latest = readerPollRepository
                            .findTopBySeriesIdOrderByPollDateDescCreatedAtDesc(series.getId()).orElse(null);
                    ReaderPoll previous = latest != null
                            ? readerPollRepository.findTopBySeriesIdAndPollDateBeforeOrderByPollDateDesc(
                            series.getId(), latest.getPollDate()).orElse(null)
                            : null;

                    int curr = latest != null ? latest.getRankPosition() : 0;
                    int prev = previous != null ? previous.getRankPosition() : curr;
                    String trend = curr < prev ? "up" : curr > prev ? "down" : "stable";

                    // Đếm liên tiếp gần nhất với ngưỡng động 20% cuối bảng
                    int totalPub = seriesRepository.countByStatus(Series.SeriesStatus.publishing);
                    int thr = Math.max(1, (int) Math.ceil(totalPub * AT_RISK_BOTTOM_PCT));
                    List<ReaderPoll> recent = readerPollRepository
                            .findTop5BySeriesIdOrderByPollDateDescCreatedAtDesc(series.getId());
                    int consecutiveLow = 0;
                    if (totalPub > 1) {
                        for (ReaderPoll p : recent) {
                            if (p.getRankPosition() != null
                                    && p.getRankPosition() > (totalPub - thr)) consecutiveLow++;
                            else break;
                        }
                    }

                    Double rs = latest != null ? latest.getReaderScore() : null;
                    Integer rv = latest != null ? latest.getReaderVoteCount() : null;
                    Double ws = null;
                    if (rs != null) {
                        double v = rv != null ? rv : 0;
                        double R = (v * rs + 20 * 6.8) / (v + 20);
                        ws = Math.round(R * 100.0) / 100.0;
                    }
                    SeriesRankingDTO dto = new SeriesRankingDTO();
                    dto.setSeriesId(series.getId());
                    dto.setSeriesTitle(series.getTitle());
                    dto.setSeriesStatus(series.getStatus() != null ? series.getStatus().name() : null);
                    dto.setCurrentRank(curr);
                    dto.setPreviousRank(prev);
                    dto.setTrend(trend);
                    dto.setCurrentVotes(latest != null ? latest.getVoteCount() : 0);
                    dto.setPreviousVotes(previous != null ? previous.getVoteCount() : 0);
                    dto.setAtRisk(series.getCancellationRisk() != null && series.getCancellationRisk());
                    dto.setConsecutiveLowPeriods(consecutiveLow);
                    dto.setLastUpdate(latest != null ? latest.getPollDate().toString() : null);
                    dto.setReaderScore(rs);
                    dto.setReaderVoteCount(rv);
                    dto.setWeightedScore(ws);
                    dto.setLatestPollId(latest != null ? latest.getId() : null);
                    dto.setLatestPollPeriod(latest != null ? latest.getPollPeriod() : null);
                    dto.setLatestPollYear(latest != null ? latest.getPollYear() : null);
                    // publishOnTimeRate + publishTotalCount + publishAvgDaysLate
                    List<com.mangaproject.backend.model.Chapter> pubChapters =
                        chapterRepository.findBySeries_IdOrderByChapterNumberAsc(series.getId())
                        .stream().filter(c -> c.getStatus() == com.mangaproject.backend.model.Chapter.ChapterStatus.published).toList();
                    int onTimeCount = (int) pubChapters.stream().filter(c ->
                        c.getPublishedAt() != null && c.getDeadline() != null
                        && !c.getPublishedAt().isAfter(c.getDeadline())).count();
                    int lateCount = (int) pubChapters.stream().filter(c ->
                        c.getPublishedAt() != null && c.getDeadline() != null
                        && c.getPublishedAt().isAfter(c.getDeadline())).count();
                    long totalDaysLate = pubChapters.stream()
                        .filter(c -> c.getPublishedAt() != null && c.getDeadline() != null
                            && c.getPublishedAt().isAfter(c.getDeadline()))
                        .mapToLong(c -> java.time.temporal.ChronoUnit.DAYS.between(c.getDeadline(), c.getPublishedAt()))
                        .sum();
                    dto.setPublishOnTimeRate(pubChapters.isEmpty() ? null
                        : (int) Math.round((double) onTimeCount / pubChapters.size() * 100));
                    dto.setPublishTotalCount(pubChapters.size());
                    dto.setPublishAvgDaysLate(lateCount > 0 ? (int) Math.round((double) totalDaysLate / lateCount) : null);
                    return dto;
                }).sorted(Comparator.comparingInt(r -> r.getCurrentRank() == 0 ? 999 : r.getCurrentRank()))
                .collect(Collectors.toList());
    }
}