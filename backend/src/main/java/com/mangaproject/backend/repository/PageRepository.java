package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PageRepository extends JpaRepository<Page, String> {

    List<Page> findByChapterIdOrderByPageNumberAsc(String chapterId);

    Optional<Page> findByChapterIdAndPageNumber(String chapterId, Integer pageNumber);

    boolean existsByChapterIdAndPageNumber(String chapterId, Integer pageNumber);

    long countByChapterId(String chapterId);
}