package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "board_votes",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_board_votes_submission_voter",
        columnNames = {"submission_id", "voter_id"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardVote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "submission_id", nullable = false)
    private String submissionId;

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

    public enum VoteChoice {
        yes, no, abstain
    }
}
