package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PageRepository extends JpaRepository<Page, String> {

    List<Page> findByChapter_IdOrderByPageNumberAsc(String chapterId);

    Optional<Page> findByChapter_IdAndPageNumber(String chapterId, Integer pageNumber);

    boolean existsByChapter_IdAndPageNumber(String chapterId, Integer pageNumber);

    long countByChapter_Id(String chapterId);
    List<Page> findByChapterId(String chapterId);
    void deleteByChapterId(String chapterId);
}