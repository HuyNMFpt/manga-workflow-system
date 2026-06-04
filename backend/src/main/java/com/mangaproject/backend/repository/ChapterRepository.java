package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, String> {

    List<Chapter> findBySeries_IdOrderByChapterNumberAsc(String seriesId);

    Optional<Chapter> findBySeries_IdAndChapterNumber(String seriesId, Integer chapterNumber);

    boolean existsBySeries_IdAndChapterNumber(String seriesId, Integer chapterNumber);

    @Query("SELECT c FROM Chapter c LEFT JOIN FETCH c.pages WHERE c.id = :id")
    Optional<Chapter> findByIdWithPages(@Param("id") String id);

    long countBySeries_Id(String seriesId);
}