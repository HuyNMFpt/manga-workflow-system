package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.ManuscriptAnnotation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ManuscriptAnnotationRepository extends JpaRepository<ManuscriptAnnotation, String> {
    List<ManuscriptAnnotation> findByManuscriptIdOrderByCreatedAtAsc(String manuscriptId);
}
