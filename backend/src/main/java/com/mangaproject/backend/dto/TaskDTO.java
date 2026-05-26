package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskDTO {
    private String id;
    private String pageId;
    private String chapterId;
    private String seriesId;
    private String assignedTo;
    private String taskType;
    private String regionData;
    private String instructions;
    private String status;
    private String submissionUrl;
    private String revisionNote;
    private String deadline;
    private String createdAt;
    private String updatedAt;
}