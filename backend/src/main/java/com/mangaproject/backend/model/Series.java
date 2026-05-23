package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
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

    @Column(nullable = false)
    private String title;

    private String genre;

    @Column(columnDefinition = "TEXT")
    private String synopsis;

    private String coverUrl;

    @Column(nullable = false)
    private String mangakaId;

    private String editorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SeriesStatus status;

    @Enumerated(EnumType.STRING)
    private PublicationSchedule schedule;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public enum SeriesStatus {
        draft, pending_review, in_review, approved, rejected,
        serializing, on_hold, cancelled
    }

    public enum PublicationSchedule {
        weekly, monthly, one_shot
    }
}