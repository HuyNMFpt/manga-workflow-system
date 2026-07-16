package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, String> {
    List<Submission> findBySubmittedByOrderByCreatedAtDesc(String submittedBy);
    Optional<Submission> findByManuscriptId(String manuscriptId);
    List<Submission> findByStatusOrderByCreatedAtDesc(Submission.SubmissionStatus status);
    void deleteByManuscriptId(String manuscriptId);

    // Dùng cho VotingDeadlineScheduler
    List<Submission> findByStatusInAndVotingDeadlineBefore(
            List<Submission.SubmissionStatus> statuses, java.time.LocalDateTime deadline);
    long countByManuscriptId(String manuscriptId);

    // Tối ưu getStats() — thay findAll() bằng query có filter
    @Query("SELECT s FROM Submission s WHERE s.status IN :statuses AND s.decidedAt > :after")
    List<Submission> findByStatusInAndDecidedAtAfter(
            @Param("statuses") List<Submission.SubmissionStatus> statuses,
            @Param("after") LocalDateTime after);
}