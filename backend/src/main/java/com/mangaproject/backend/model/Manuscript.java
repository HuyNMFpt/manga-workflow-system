package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "manuscripts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Manuscript {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "series_id", nullable = false)
    private String seriesId;

    @Column(name = "submitted_by", nullable = false)
    private String submittedBy;

    @Column(nullable = false)
    private Integer version = 1;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ManuscriptStatus status = ManuscriptStatus.draft;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public enum ManuscriptStatus {
        draft, submitted, under_review, approved, rejected, revision_requested, publishing
    }
}