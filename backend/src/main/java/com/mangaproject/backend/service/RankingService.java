package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.SeriesRankingDTO;
import com.mangaproject.backend.model.ReaderPoll;
import com.mangaproject.backend.model.Series;
import com.mangaproject.backend.repository.ReaderPollRepository;
import com.mangaproject.backend.repository.SeriesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RankingService {

    private final SeriesRepository seriesRepository;
    private final ReaderPollRepository readerPollRepository;

    public List<SeriesRankingDTO> getAllRankings() {
        return seriesRepository.findByStatusIn(
                List.of(Series.SeriesStatus.publishing, Series.SeriesStatus.approved)
        ).stream()
                .map(this::buildRankingDTO)
                .collect(Collectors.toList());
    }

    public List<SeriesRankingDTO> getRankingsByMangaka(String mangakaId) {
        return seriesRepository.findByMangakaId(mangakaId).stream()
                .map(this::buildRankingDTO)
                .collect(Collectors.toList());
    }

    private SeriesRankingDTO buildRankingDTO(Series series) {
        // Lấy poll mới nhất
        ReaderPoll latest = readerPollRepository
                .findTopBySeriesIdOrderByPollDateDesc(series.getId())
                .orElse(null);

        // Lấy poll trước đó
        ReaderPoll previous = latest != null
                ? readerPollRepository
                .findTopBySeriesIdAndPollDateBeforeOrderByPollDateDesc(
                        series.getId(), latest.getPollDate())
                .orElse(null)
                : null;

        int currentRank = latest != null ? latest.getRankPosition() : 0;
        int previousRank = previous != null ? previous.getRankPosition() : currentRank;
        int currentVotes = latest != null ? latest.getVoteCount() : 0;
        int previousVotes = previous != null ? previous.getVoteCount() : 0;

        String trend = "stable";
        if (currentRank < previousRank) trend = "up";
        else if (currentRank > previousRank) trend = "down";

        // Đếm số kỳ liên tiếp xếp hạng thấp (rank > 20) — chỉ tính liên tiếp gần nhất,
        // dừng ngay khi gặp 1 kỳ không thấp (không đếm tổng toàn bộ lịch sử)
        List<ReaderPoll> recentPolls = readerPollRepository
                .findTop5BySeriesIdOrderByPollDateDesc(series.getId());
        int consecutiveLow = 0;
        for (ReaderPoll p : recentPolls) {
            if (p.getRankPosition() != null && p.getRankPosition() > 20) {
                consecutiveLow++;
            } else {
                break;
            }
        }

        Integer readerScore = latest != null ? latest.getReaderScore() : null;

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
                readerScore
        );
    }
}