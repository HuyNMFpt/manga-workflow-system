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

    // m = ngưỡng tối thiểu số người chấm để điểm R tin cậy
    private static final int BAYESIAN_M = 20;
    // C = default điểm trung bình hệ thống khi chưa đủ data
    private static final double BAYESIAN_C_DEFAULT = 6.8;
    // 20% cuối bảng xếp hạng bị tính là "kỳ thấp" — đồng bộ với BoardService
    private static final double AT_RISK_BOTTOM_PCT = 0.2;

    public List<SeriesRankingDTO> getAllRankings() {
        List<Series> allSeries = seriesRepository.findByStatusIn(
                List.of(Series.SeriesStatus.publishing, Series.SeriesStatus.approved)
        );

        // Tính C động: trung bình readerScore của tất cả series có poll
        // chỉ dùng khi có ít nhất 5 series có điểm để kết quả có ý nghĩa thống kê
        List<ReaderPoll> latestPolls = allSeries.stream()
                .map(s -> readerPollRepository.findTopBySeriesIdOrderByPollDateDesc(s.getId()).orElse(null))
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
                .findTopBySeriesIdOrderByPollDateDesc(series.getId())
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
                .findTop5BySeriesIdOrderByPollDateDesc(series.getId());
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

        return new SeriesRankingDTO(
                series.getId(),
                series.getTitle(),
                currentRank,
                previousRank,
                trend,
                currentVotes,
                previousVotes,
                series.getCancellationRisk() != null && series.getCancellationRisk(),
                consecutiveLow,
                latest != null ? latest.getPollDate().toString() : null,
                readerScore,
                readerVoteCount,
                weightedScore
        );
    }
}