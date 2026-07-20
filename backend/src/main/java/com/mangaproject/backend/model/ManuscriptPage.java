package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "manuscript_pages")
@Data @NoArgsConstructor @AllArgsConstructor
public class ManuscriptPage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "manuscript_id", nullable = false)
    private String manuscriptId;

    @Column(name = "page_number", nullable = false)
    private Integer pageNumber;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
