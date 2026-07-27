package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ManuscriptPageDTO {
    private String id;
    private String manuscriptId;
    private Integer pageNumber;
    private String imageUrl;
    private String thumbnailUrl;
    private String notes;
}
