package com.mangaproject.backend.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ManuscriptDTO {
    private String id;
    private String seriesId;
    private String seriesTitle;
    private String seriesStatus;    // draft|submitted|publishing|cancelled — frontend cần để filter
    private String submittedBy;
    private Integer version;
    private String fileUrl;
    private String description;
    private String status;
    private String rejectionReason;
    private String submittedAt;
    private String createdAt;
    private List<AnnotationDTO> annotations;
}