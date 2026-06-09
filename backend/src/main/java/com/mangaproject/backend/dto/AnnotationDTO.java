package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnnotationDTO {
    private String id;
    private String note;
    private String tag;
    private Double x;
    private Double y;
    private Integer pageNumber;
    private String createdAt;
}
