package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.Series;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SeriesRepository extends JpaRepository<Series, String> {
    List<Series> findByMangakaId(String mangakaId);
    List<Series> findByEditorId(String editorId);
    List<Series> findByStatusIn(List<Series.SeriesStatus> statuses);
}