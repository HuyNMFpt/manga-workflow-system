package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.ReaderPoll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface ReaderPollRepository extends JpaRepository<ReaderPoll, String> {
    Optional<ReaderPoll> findTopBySeriesIdOrderByPollDateDesc(String seriesId);
    Optional<ReaderPoll> findTopBySeriesIdAndPollDateBeforeOrderByPollDateDesc(
            String seriesId, LocalDate date);
    long countBySeriesIdAndRankPositionGreaterThan(String seriesId, int rank);
}
