package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "series")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Series {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "mangaka_id", nullable = false)
    private String mangakaId;

    @Column(name = "editor_id")
    private String editorId;

    @Column(nullable = false)
    private String title;

    @Column(unique = true, nullable = false)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String synopsis;

    private String genre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SeriesStatus status = SeriesStatus.draft;

    @Enumerated(EnumType.STRING)
    @Column(name = "publish_schedule")
    private PublishSchedule publishSchedule;

    @Column(name = "cover_image_url")
    private String coverUrl;

    @Column(name = "current_rank")
    private Integer currentRank;

    @Column(name = "previous_rank")
    private Integer previousRank;

    @Column(name = "cancellation_risk", nullable = false)
    private Boolean cancellationRisk = false;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public enum SeriesStatus {
        draft, submitted, approved, publishing, on_hiatus, cancelled
    }

    public enum PublishSchedule {
        weekly, monthly
    }
}