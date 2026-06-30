package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.EditorialProposal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EditorialProposalRepository extends JpaRepository<EditorialProposal, String> {
    List<EditorialProposal> findByStatus(EditorialProposal.ProposalStatus status);
    List<EditorialProposal> findBySeriesIdAndStatus(String seriesId, EditorialProposal.ProposalStatus status);
    List<EditorialProposal> findByStatusOrderByCreatedAtDesc(EditorialProposal.ProposalStatus status);
}
