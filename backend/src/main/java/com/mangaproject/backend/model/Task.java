package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "panel_tasks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "page_id", nullable = false)
    private String pageId;

    @Column(name = "assigned_to", nullable = false)
    private String assignedTo;

    @Column(name = "assigned_by", nullable = false)
    private String assignedBy;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false)
    private TaskType taskType;

    @Column(name = "panel_region", columnDefinition = "JSON")
    private String panelRegion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority = Priority.normal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.pending;

    @Column(name = "revision_notes", columnDefinition = "TEXT")
    private String revisionNotes;

    @Column(name = "payment_amount", precision = 10, scale = 2)
    private BigDecimal paymentAmount;

    @Column(name = "is_paid", nullable = false)
    private Boolean isPaid = false;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum TaskType {
        background, shading, effect, screentone, dialog, touch_up, other
    }

    public enum TaskStatus {
        pending, in_progress, submitted, approved, revision_needed
    }

    public enum Priority {
        low, normal, high, urgent
    }
}