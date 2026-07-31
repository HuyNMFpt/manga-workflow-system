package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.ReaderPoll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReaderPollRepository extends JpaRepository<ReaderPoll, String> {
    Optional<ReaderPoll> findTopBySeriesIdOrderByPollDateDescCreatedAtDesc(String seriesId);

    // Tiebreak: cùng pollDate thì ưu tiên pollPeriod DESC, pollYear DESC
    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM ReaderPoll p WHERE p.seriesId = :seriesId " +
        "ORDER BY p.pollDate DESC, p.pollPeriod DESC, p.pollYear DESC LIMIT 1")
    Optional<ReaderPoll> findLatestBySeriesId(@org.springframework.data.repository.query.Param("seriesId") String seriesId);

    Optional<ReaderPoll> findTopBySeriesIdAndPollDateBeforeOrderByPollDateDesc(
            String seriesId, LocalDate date);
    long countBySeriesIdAndRankPositionGreaterThan(String seriesId, int rank);

    // Lấy 5 kỳ gần nhất để check at-risk liên tiếp (#6)
    List<ReaderPoll> findTop5BySeriesIdOrderByPollDateDescCreatedAtDesc(String seriesId);

    // Tự tính rankPosition từ voteCount trong cùng kỳ (#4)
    int countByPollPeriodAndPollYearAndVoteCountGreaterThan(
            Integer pollPeriod, Integer pollYear, Integer voteCount);

    // Chặn duplicate: cùng series + kỳ + năm chỉ nhập 1 lần
    boolean existsBySeriesIdAndPollPeriodAndPollYear(
            String seriesId, Integer pollPeriod, Integer pollYear);

    // Upsert: tìm poll đã tồn tại để cập nhật
    Optional<ReaderPoll> findBySeriesIdAndPollPeriodAndPollYear(
            String seriesId, Integer pollPeriod, Integer pollYear);

    // Delete cascade khi xóa series
    void deleteBySeriesId(String seriesId);
}