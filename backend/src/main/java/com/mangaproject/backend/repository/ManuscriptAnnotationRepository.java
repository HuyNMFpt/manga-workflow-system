package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.ManuscriptAnnotation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ManuscriptAnnotationRepository extends JpaRepository<ManuscriptAnnotation, String> {
    void deleteByManuscriptId(String manuscriptId);
    List<ManuscriptAnnotation> findByManuscriptIdOrderByCreatedAtAsc(String manuscriptId);

    // Xóa annotation cụ thể của Editor — check ownership trước khi xóa
    void deleteByIdAndEditorId(String id, String editorId);

    // Đếm số annotation của 1 bản thảo
    int countByManuscriptId(String manuscriptId);
}