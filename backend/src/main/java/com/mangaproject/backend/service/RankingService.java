package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.SeriesRankingDTO;
import com.mangaproject.backend.model.ReaderPoll;
import com.mangaproject.backend.model.Series;
import com.mangaproject.backend.repository.ReaderPollRepository;
import com.mangaproject.backend.repository.SeriesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.OptionalDouble;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RankingService {

    private final SeriesRepository seriesRepository;
    private final ReaderPollRepository readerPollRepository;
    private final com.mangaproject.backend.repository.ChapterRepository chapterRepository;

    // m = ngưỡng tối thiểu số người chấm để điểm R tin cậy
    private static final int BAYESIAN_M = 20;
    // C = default điểm trung bình hệ thống khi chưa đủ data
    private static final double BAYESIAN_C_DEFAULT = 6.8;
    // 20% cuối bảng xếp hạng bị tính là "kỳ thấp" — đồng bộ với BoardService
    private static final double AT_RISK_BOTTOM_PCT = 0.2;

    public List<SeriesRankingDTO> getAllRankings() {
        List<Series> allSeries = seriesRepository.findByStatusIn(
                List.of(Series.SeriesStatus.publishing, Series.SeriesStatus.approved, Series.SeriesStatus.on_hiatus)
        );

        // Tính C động: trung bình readerScore của tất cả series có poll
        // chỉ dùng khi có ít nhất 5 series có điểm để kết quả có ý nghĩa thống kê
        List<ReaderPoll> latestPolls = allSeries.stream()
                .map(s -> readerPollRepository.findTopBySeriesIdOrderByPollDateDescCreatedAtDesc(s.getId()).orElse(null))
                .filter(p -> p != null && p.getReaderScore() != null)
                .collect(Collectors.toList());

        OptionalDouble dynamicC = latestPolls.size() >= 5
                ? latestPolls.stream().mapToDouble(p -> p.getReaderScore()).average()
                : OptionalDouble.empty();
        double C = dynamicC.orElse(BAYESIAN_C_DEFAULT);

        return allSeries.stream()
                .map(series -> buildRankingDTO(series, C))
                .collect(Collectors.toList());
    }

    public List<SeriesRankingDTO> getRankingsByMangaka(String mangakaId) {
        // Dùng C default khi xem theo mangaka — không đủ context toàn hệ thống
        return seriesRepository.findByMangakaId(mangakaId).stream()
                .map(series -> buildRankingDTO(series, BAYESIAN_C_DEFAULT))
                .collect(Collectors.toList());
    }

    private SeriesRankingDTO buildRankingDTO(Series series, double C) {
        // Poll mới nhất
        ReaderPoll latest = readerPollRepository
                .findTopBySeriesIdOrderByPollDateDescCreatedAtDesc(series.getId())
                .orElse(null);

        // Poll trước đó để tính trend
        ReaderPoll previous = latest != null
                ? readerPollRepository
                        .findTopBySeriesIdAndPollDateBeforeOrderByPollDateDesc(
                                series.getId(), latest.getPollDate())
                        .orElse(null)
                : null;

        int currentRank   = latest   != null ? latest.getRankPosition()   : 0;
        int previousRank  = previous != null ? previous.getRankPosition()  : currentRank;
        int currentVotes  = latest   != null ? latest.getVoteCount()       : 0;
        int previousVotes = previous != null ? previous.getVoteCount()     : 0;

        String trend = "stable";
        if (currentRank < previousRank) trend = "up";
        else if (currentRank > previousRank) trend = "down";

        // consecutiveLow: đếm kỳ xếp hạng thấp LIÊN TIẾP từ gần nhất
        // Ngưỡng động: 20% cuối bảng — đồng bộ với BoardService
        int totalPublishing = seriesRepository.findByStatusIn(
                List.of(Series.SeriesStatus.publishing)).size();
        int threshold = Math.max(1, (int) Math.ceil(totalPublishing * AT_RISK_BOTTOM_PCT));
        List<ReaderPoll> recentPolls = readerPollRepository
                .findTop5BySeriesIdOrderByPollDateDescCreatedAtDesc(series.getId());
        int consecutiveLow = 0;
        if (totalPublishing > 1) {
            for (ReaderPoll p : recentPolls) {
                if (p.getRankPosition() != null
                        && p.getRankPosition() > (totalPublishing - threshold)) consecutiveLow++;
                else break;
            }
        }

        Double readerScore     = latest != null ? latest.getReaderScore()     : null;
        Integer readerVoteCount = latest != null ? latest.getReaderVoteCount() : null;

        // R = Bayesian Weighted Rating
        // R = (v × S + m × C) / (v + m)
        // Series chưa có điểm: R = null (frontend hiển thị C mặc định = 6.8 theo yêu cầu)
        Double weightedScore = null;
        if (readerScore != null) {
            double v = readerVoteCount != null ? readerVoteCount : 0;
            double S = readerScore;
            double R = (v * S + BAYESIAN_M * C) / (v + BAYESIAN_M);
            // Làm tròn 2 chữ số thập phân
            weightedScore = Math.round(R * 100.0) / 100.0;
        }

        SeriesRankingDTO dto = new SeriesRankingDTO();
        dto.setSeriesId(series.getId());
        dto.setSeriesTitle(series.getTitle());
        dto.setCurrentRank(currentRank);
        dto.setPreviousRank(previousRank);
        dto.setTrend(trend);
        dto.setCurrentVotes(currentVotes);
        dto.setPreviousVotes(previousVotes);
        dto.setAtRisk(series.getCancellationRisk() != null && series.getCancellationRisk());
        dto.setConsecutiveLowPeriods(consecutiveLow);
        dto.setLastUpdate(latest != null ? latest.getPollDate().toString() : null);
        dto.setReaderScore(readerScore);
        dto.setReaderVoteCount(readerVoteCount);
        dto.setWeightedScore(weightedScore);
        dto.setLatestPollId(latest != null ? latest.getId() : null);
        dto.setLatestPollPeriod(latest != null ? latest.getPollPeriod() : null);
        dto.setLatestPollYear(latest != null ? latest.getPollYear() : null);
        // Tính publishOnTimeRate/TotalCount/AvgDaysLate đồng bộ với BoardService
        java.util.List<com.mangaproject.backend.model.Chapter> pubChapters =
            chapterRepository.findBySeries_IdOrderByChapterNumberAsc(series.getId())
            .stream().filter(c -> c.getStatus() == com.mangaproject.backend.model.Chapter.ChapterStatus.published)
            .toList();
        int onTime = (int) pubChapters.stream().filter(c ->
            c.getPublishedAt() != null && c.getDeadline() != null
            && !c.getPublishedAt().isAfter(c.getDeadline())).count();
        int late = (int) pubChapters.stream().filter(c ->
            c.getPublishedAt() != null && c.getDeadline() != null
            && c.getPublishedAt().isAfter(c.getDeadline())).count();
        long totalDaysLate = pubChapters.stream()
            .filter(c -> c.getPublishedAt() != null && c.getDeadline() != null
                && c.getPublishedAt().isAfter(c.getDeadline()))
            .mapToLong(c -> java.time.temporal.ChronoUnit.DAYS.between(c.getDeadline(), c.getPublishedAt()))
            .sum();
        dto.setPublishOnTimeRate(pubChapters.isEmpty() ? null
            : (int) Math.round((double) onTime / pubChapters.size() * 100));
        dto.setPublishTotalCount(pubChapters.size());
        dto.setPublishAvgDaysLate(late > 0 ? (int) Math.round((double) totalDaysLate / late) : null);
        dto.setSeriesStatus(series.getStatus() != null ? series.getStatus().name() : null);
        return dto;
    }
}