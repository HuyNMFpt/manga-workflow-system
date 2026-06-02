package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskDTO {
    private String id;
    private String pageId;
    private String assignedTo;
    private String assignedBy;
    private String title;
    private String description;
    private String taskType;
    private String panelRegion;
    private String priority;
    private String status;
    private String revisionNotes;
    private String dueDate;
    private String submittedAt;
    private String approvedAt;
    private String createdAt;
    private String updatedAt;
}