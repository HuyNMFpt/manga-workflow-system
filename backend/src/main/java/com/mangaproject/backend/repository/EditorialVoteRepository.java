package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.EditorialVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EditorialVoteRepository extends JpaRepository<EditorialVote, String> {
    boolean existsByProposalIdAndVoterId(String proposalId, String voterId);
    long countByProposalId(String proposalId);
}
