package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.Series;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SeriesRepository extends JpaRepository<Series, String> {
    List<Series> findByMangakaId(String mangakaId);
    List<Series> findByStatus(Series.SeriesStatus status);
}