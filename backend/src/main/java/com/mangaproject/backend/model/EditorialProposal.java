package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "editorial_proposals")
@Data @NoArgsConstructor @AllArgsConstructor
public class EditorialProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "series_id", nullable = false)
    private String seriesId;

    @Column(name = "action_type", nullable = false)
    private String actionType; // cancel, hiatus, reinstate, change_schedule

    private String newSchedule; // chỉ dùng khi action_type = change_schedule

    @Column(name = "proposed_by", nullable = false)
    private String proposedBy;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Column(nullable = false)
    private Integer voteYes = 0;

    @Column(nullable = false)
    private Integer voteNo = 0;

    @Column(name = "vote_abstain", nullable = false)
    private Integer voteAbstain = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProposalStatus status = ProposalStatus.voting;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum ProposalStatus { voting, approved, rejected }
}
