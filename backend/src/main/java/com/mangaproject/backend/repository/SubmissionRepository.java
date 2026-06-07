package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, String> {
    List<Submission> findBySubmittedByOrderByCreatedAtDesc(String submittedBy);
    Optional<Submission> findByManuscriptId(String manuscriptId);
    List<Submission> findByStatusOrderByCreatedAtDesc(Submission.SubmissionStatus status);
    long countByManuscriptId(String manuscriptId);
}