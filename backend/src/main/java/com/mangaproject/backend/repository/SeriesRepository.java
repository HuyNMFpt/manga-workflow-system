package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.Series;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SeriesRepository extends JpaRepository<Series, String> {
    List<Series> findByMangakaId(String mangakaId);
    List<Series> findByEditorId(String editorId);
    List<Series> findByStatusIn(List<Series.SeriesStatus> statuses);
    List<Series> findByStatus(Series.SeriesStatus status);

    // Auto-assign editor: đếm số series active đang được assign cho mỗi editor
    @Query("SELECT s.editorId, COUNT(s) FROM Series s " +
           "WHERE s.editorId IS NOT NULL " +
           "AND s.status IN ('submitted','under_review','publishing') " +
           "GROUP BY s.editorId")
    List<Object[]> countActiveSeriesByEditor();

    // At-risk dynamic threshold: đếm tổng series đang publishing
    int countByStatus(Series.SeriesStatus status);
}