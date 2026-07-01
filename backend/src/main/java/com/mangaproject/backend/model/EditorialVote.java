package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "editorial_votes",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_editorial_votes_proposal_voter",
        columnNames = {"proposal_id", "voter_id"}
    )
)
@Data @NoArgsConstructor @AllArgsConstructor
public class EditorialVote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "proposal_id", nullable = false)
    private String proposalId;

    @Column(name = "voter_id", nullable = false)
    private String voterId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VoteChoice vote;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    @Column(name = "voted_at", nullable = false, updatable = false)
    private LocalDateTime votedAt;

    public enum VoteChoice { yes, no, abstain }
}
