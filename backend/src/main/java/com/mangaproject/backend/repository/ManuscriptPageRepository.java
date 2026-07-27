package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.ManuscriptPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ManuscriptPageRepository extends JpaRepository<ManuscriptPage, String> {
    List<ManuscriptPage> findByManuscriptIdOrderByPageNumberAsc(String manuscriptId);
    boolean existsByManuscriptIdAndPageNumber(String manuscriptId, Integer pageNumber);

    @Query("SELECT MAX(p.pageNumber) FROM ManuscriptPage p WHERE p.manuscriptId = :manuscriptId")
    Optional<Integer> findMaxPageNumber(@Param("manuscriptId") String manuscriptId);
}
