package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String pageId;

    @Column(nullable = false)
    private String chapterId;

    @Column(nullable = false)
    private String seriesId;

    @Column(nullable = false)
    private String assignedTo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskType taskType;

    @Column(columnDefinition = "JSON")
    private String regionData;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    private String submissionUrl;

    @Column(columnDefinition = "TEXT")
    private String revisionNote;

    @Column(nullable = false)
    private LocalDateTime deadline;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public enum TaskType {
        background, inking, toning, effects, text_cleanup
    }

    public enum TaskStatus {
        assigned, in_progress, submitted, revision_required, approved
    }
}