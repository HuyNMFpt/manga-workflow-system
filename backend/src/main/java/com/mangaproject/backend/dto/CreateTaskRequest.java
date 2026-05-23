package com.mangaproject.backend.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateTaskRequest {
    @NotBlank
    private String pageId;

    @NotBlank
    private String chapterId;

    @NotBlank
    private String seriesId;

    @NotBlank
    private String assignedTo;

    @NotBlank
    private String taskType;

    private String regionData;

    private String instructions;

    @NotBlank
    private String deadline;
}