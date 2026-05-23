package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "pages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Page {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id", nullable = false)
    private Chapter chapter;

    @Column(nullable = false)
    private Integer pageNumber;

    @Column(nullable = false, length = 500)
    private String imageUrl; // URL to stored image

    @Column(length = 500)
    private String thumbnailUrl; // Thumbnail for preview

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PageStatus status = PageStatus.DRAFT;

    @Column(columnDefinition = "TEXT")
    private String notes; // Page notes

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum PageStatus {
        DRAFT,          // Chưa upload
        UPLOADED,       // Đã upload
        IN_PROGRESS,    // Đang làm việc
        REVIEW,         // Đang review
        APPROVED,       // Đã duyệt
        PUBLISHED       // Đã xuất bản
    }
}