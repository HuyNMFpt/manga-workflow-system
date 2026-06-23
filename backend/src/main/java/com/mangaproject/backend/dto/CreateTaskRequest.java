package com.mangaproject.backend.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateTaskRequest {
    @NotBlank
    private String pageId;

    @NotBlank
    private String assignedTo;

    // Set by Controller from JWT token, không cần validate
    private String assignedBy;

    @NotBlank
    private String title;

    private String description;

    @NotBlank
    private String taskType;

    private String panelRegion;

    private String priority;

    private String dueDate;
}