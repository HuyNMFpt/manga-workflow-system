package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "manuscript_annotations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ManuscriptAnnotation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "manuscript_id", nullable = false)
    private String manuscriptId;

    @Column(name = "editor_id", nullable = false)
    private String editorId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String note;

    @Column(length = 50)
    private String tag; // story | dialogue | art | pacing | layout

    @Column
    private Double x; // % horizontal từ trái ảnh

    @Column
    private Double y; // % vertical từ trên ảnh

    @Column(name = "page_number")
    private Integer pageNumber;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}