package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "submissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "manuscript_id", nullable = false)
    private String manuscriptId;

    @Column(name = "submitted_by", nullable = false)
    private String submittedBy;

    @Column(name = "submission_round", nullable = false)
    private Integer submissionRound = 1;

    @Column(name = "cover_letter", columnDefinition = "TEXT")
    private String coverLetter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubmissionStatus status = SubmissionStatus.pending;

    @Column(name = "vote_yes", nullable = false)
    private Integer voteYes = 0;

    @Column(name = "vote_no", nullable = false)
    private Integer voteNo = 0;

    @Column(name = "vote_abstain", nullable = false)
    private Integer voteAbstain = 0;

    @Column(name = "voting_deadline")
    private LocalDateTime votingDeadline;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    // ── Editor evaluation fields (lưu thẳng vào submission thay vì parse text) ──
    @Column(name = "audience_summary", columnDefinition = "TEXT")
    private String audienceSummary;

    @Column(name = "marketing_angle", columnDefinition = "TEXT")
    private String marketingAngle;

    @Column(name = "why_it_will_sell", columnDefinition = "TEXT")
    private String whyItWillSell;

    @Column(name = "editor_note", columnDefinition = "TEXT")
    private String editorNote;

    @Column(name = "recommended_schedule")
    private String recommendedSchedule;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum SubmissionStatus {
        pending, voting, approved, rejected
    }
}