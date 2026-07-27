package com.mangaproject.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageDTO {
    private String id;
    private String chapterId;
    private Integer pageNumber;
    private String imageUrl;
    private String thumbnailUrl;
    private String status;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Mục 3: fields bổ sung cho TaskAssignment UI
    private String pageStatus;          // trạng thái tổng hợp: no_task | pending | in_progress | submitted | approved
    private String activeTaskType;      // task type đang active (null nếu không có)
    private String activeAssigneeName;  // tên assistant được giao (null nếu chưa giao)
}