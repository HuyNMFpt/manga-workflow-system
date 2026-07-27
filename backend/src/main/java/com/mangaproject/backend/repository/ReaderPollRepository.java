package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.ReaderPoll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReaderPollRepository extends JpaRepository<ReaderPoll, String> {
    Optional<ReaderPoll> findTopBySeriesIdOrderByPollDateDesc(String seriesId);
    Optional<ReaderPoll> findTopBySeriesIdAndPollDateBeforeOrderByPollDateDesc(
            String seriesId, LocalDate date);
    long countBySeriesIdAndRankPositionGreaterThan(String seriesId, int rank);

    // Lấy 5 kỳ gần nhất để check at-risk liên tiếp (#6)
    List<ReaderPoll> findTop5BySeriesIdOrderByPollDateDesc(String seriesId);

    // Tự tính rankPosition từ voteCount trong cùng kỳ (#4)
    int countByPollPeriodAndPollYearAndVoteCountGreaterThan(
            Integer pollPeriod, Integer pollYear, Integer voteCount);

    // Chặn duplicate: cùng series + kỳ + năm chỉ nhập 1 lần
    boolean existsBySeriesIdAndPollPeriodAndPollYear(
            String seriesId, Integer pollPeriod, Integer pollYear);

    // Upsert: tìm poll đã tồn tại để cập nhật
    Optional<ReaderPoll> findBySeriesIdAndPollPeriodAndPollYear(
            String seriesId, Integer pollPeriod, Integer pollYear);
}