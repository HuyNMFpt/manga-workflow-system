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

    // ── Dashboard stats ──────────────────────────────────────────
    public BoardStatsDTO getStats() {
        // Dedup: chỉ đếm 1 submission mới nhất per series
        List<Submission> allPending = new ArrayList<>();
        allPending.addAll(submissionRepository.findByStatusOrderByCreatedAtDesc(Submission.SubmissionStatus.pending));
        allPending.addAll(submissionRepository.findByStatusOrderByCreatedAtDesc(Submission.SubmissionStatus.voting));

        int pendingVotes = (int) allPending.stream()
                .collect(java.util.stream.Collectors.toMap(
                        sub -> {
                            Manuscript ms = manuscriptRepository.findById(sub.getManuscriptId()).orElse(null);
                            return ms != null ? ms.getSeriesId() : sub.getId();
                        },
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

        // Quyết định tháng này (editorial actions) — dùng submissions decided tháng này
        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        int decisionsThisMonth = (int) submissionRepository.findAll().stream()
                .filter(s -> (s.getStatus() == Submission.SubmissionStatus.approved
                        || s.getStatus() == Submission.SubmissionStatus.rejected)
                        && s.getDecidedAt() != null
                        && s.getDecidedAt().isAfter(startOfMonth))
                .count();

        return new BoardStatsDTO(pendingVotes, totalActive, atRisk, decisionsThisMonth);
    }

    // ── Voting Queue — danh sách submissions chờ vote ────────────
    public List<SubmissionDetailDTO> getPendingSubmissions(String boardMemberId) {
        List<Submission> allSubmissions = new ArrayList<>();
        allSubmissions.addAll(submissionRepository.findByStatusOrderByCreatedAtDesc(Submission.SubmissionStatus.pending));
        allSubmissions.addAll(submissionRepository.findByStatusOrderByCreatedAtDesc(Submission.SubmissionStatus.voting));

        // Dedup: chỉ lấy submission mới nhất theo manuscriptId
        Map<String, Submission> latestByManuscript = new LinkedHashMap<>();
        for (Submission sub : allSubmissions) {
            latestByManuscript.putIfAbsent(sub.getManuscriptId(), sub);
        }
        List<Submission> submissions = new ArrayList<>(latestByManuscript.values());

        return submissions.stream().map(sub -> {
            Manuscript ms = manuscriptRepository.findById(sub.getManuscriptId()).orElse(null);
            Series series = ms != null ? seriesRepository.findById(ms.getSeriesId()).orElse(null) : null;
            String mangakaName = series != null ? userRepository.findById(series.getMangakaId())
                    .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                    .orElse("Unknown") : "Unknown";

            // Editor name — submittedBy của submission là editor
            String editorName = userRepository.findById(sub.getSubmittedBy())
                    .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                    .orElse("Unknown");

            String desc = ms != null ? ms.getDescription() : "";

            // Đọc evaluation fields trực tiếp từ submission (không parse text)
            String audienceSummary = sub.getAudienceSummary();
            String marketingAngle  = sub.getMarketingAngle();
            String whyItWillSell   = sub.getWhyItWillSell();
            String editorNote      = sub.getEditorNote();
            String recommendedSchedule = sub.getRecommendedSchedule();

            // Fallback: parse từ description nếu submission cũ chưa có fields mới
            if (audienceSummary == null) audienceSummary = parseTag(desc, "Audience");
            if (marketingAngle  == null) marketingAngle  = parseTag(desc, "Marketing");
            if (whyItWillSell   == null) whyItWillSell   = parseTag(desc, "WhySell");
            if (editorNote      == null) editorNote      = parseTag(desc, "EditorNote");
            if (recommendedSchedule == null) recommendedSchedule = parseTag(sub.getCoverLetter(), "RecommendedSchedule");

            SubmissionDetailDTO dto = new SubmissionDetailDTO();
            dto.setSubmissionId(sub.getId());
            dto.setManuscriptId(sub.getManuscriptId());
            dto.setSeriesId(series != null ? series.getId() : "");
            dto.setSeriesTitle(series != null ? series.getTitle() : "");
            dto.setSeriesGenre(series != null ? series.getGenre() : "");
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
            dto.setAudienceSummary(audienceSummary);
            dto.setMarketingAngle(marketingAngle);
            dto.setWhyItWillSell(whyItWillSell);
            dto.setRecommendedSchedule(recommendedSchedule);
            dto.setEditorNote(editorNote);
            return dto;
        }).collect(Collectors.toList());
    }

    private String parseTag(String text, String tag) {
        if (text == null) return null;
        String marker = "[" + tag + "]: ";
        int start = text.indexOf(marker);
        if (start == -1) return null;
        start += marker.length();
        int end = text.indexOf("\n", start);
        return end == -1 ? text.substring(start).trim() : text.substring(start, end).trim();
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