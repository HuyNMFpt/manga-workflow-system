package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.BoardVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BoardVoteRepository extends JpaRepository<BoardVote, String> {

    boolean existsBySubmissionIdAndVoterId(String submissionId, String voterId);

    Optional<BoardVote> findBySubmissionIdAndVoterId(String submissionId, String voterId);

    long countBySubmissionId(String submissionId);

    // Lấy danh sách vote chi tiết theo thứ tự thời gian — dùng cho getVoteDetails()
    java.util.List<BoardVote> findBySubmissionIdOrderByVotedAtAsc(String submissionId);
}