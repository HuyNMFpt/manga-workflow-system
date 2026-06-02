package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.Manuscript;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ManuscriptRepository extends JpaRepository<Manuscript, String> {
    List<Manuscript> findBySeriesIdOrderByVersionDesc(String seriesId);
    Optional<Manuscript> findTopBySeriesIdOrderByVersionDesc(String seriesId);
    boolean existsBySeriesIdAndStatus(String seriesId, Manuscript.ManuscriptStatus status);
}
