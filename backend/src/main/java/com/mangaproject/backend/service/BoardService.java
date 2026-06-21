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
                    ms.setStatus(Manuscript.ManuscriptStatus.approved);
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

        return new SubmissionDTO(
                submission.getId(), submission.getManuscriptId(), "", "",
                submission.getSubmittedBy(), submission.getSubmissionRound(),
                submission.getCoverLetter(), submission.getStatus().name(),
                submission.getVoteYes(), submission.getVoteNo(), submission.getVoteAbstain(),
                submission.getVotingDeadline() != null ? submission.getVotingDeadline().toString() : null,
                submission.getCreatedAt() != null ? submission.getCreatedAt().toString() : null
        );
    }

    // ── Nhập poll data ────────────────────────────────────────────
    @Transactional
    public ReaderPollDTO inputPollData(PollInputRequest request, String boardMemberId) {
        seriesRepository.findById(request.getSeriesId())
                .orElseThrow(() -> new RuntimeException("Series not found"));

        ReaderPoll poll = new ReaderPoll();
        poll.setSeriesId(request.getSeriesId());
        poll.setEnteredBy(boardMemberId);
        poll.setPollPeriod(request.getPollPeriod());
        poll.setPollYear(request.getPollYear());
        poll.setRankPosition(request.getRankPosition());
        poll.setVoteCount(request.getVoteCount());
        poll.setReaderScore(request.getReaderScore());
        poll.setNotes(request.getNotes());
        poll.setPollDate(request.getPollDate() != null
                ? LocalDate.parse(request.getPollDate())
                : LocalDate.now());

        poll = readerPollRepository.save(poll);

        // Cập nhật current_rank trên series
        Series series = seriesRepository.findById(request.getSeriesId()).orElse(null);
        if (series != null) {
            series.setPreviousRank(series.getCurrentRank());
            series.setCurrentRank(request.getRankPosition());

            // Check cancellation risk: rank > 20 liên tiếp 3 kỳ
            long lowPeriods = readerPollRepository
                    .countBySeriesIdAndRankPositionGreaterThan(request.getSeriesId(), 20);
            series.setCancellationRisk(lowPeriods >= 3);
            seriesRepository.save(series);
        }

        log.info("Poll data entered: seriesId={}, rank={}, votes={}",
                request.getSeriesId(), request.getRankPosition(), request.getVoteCount());

        return new ReaderPollDTO(
                poll.getId(), poll.getSeriesId(), poll.getPollPeriod(),
                poll.getPollYear(), poll.getRankPosition(), poll.getVoteCount(),
                poll.getPollDate().toString()
        );
    }

    // ── Editorial Decision ────────────────────────────────────────
    @Transactional
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
            long consecutiveLow = readerPollRepository
                    .countBySeriesIdAndRankPositionGreaterThan(series.getId(), 20);

            return new SeriesRankingDTO(
                    series.getId(), series.getTitle(), curr, prev, trend,
                    latest != null ? latest.getVoteCount() : 0,
                    previous != null ? previous.getVoteCount() : 0,
                    series.getCancellationRisk() != null && series.getCancellationRisk(),
                    (int) consecutiveLow,
                    latest != null ? latest.getPollDate().toString() : null
            );
        }).sorted(Comparator.comparingInt(r -> r.getCurrentRank() == 0 ? 999 : r.getCurrentRank()))
        .collect(Collectors.toList());
    }
}