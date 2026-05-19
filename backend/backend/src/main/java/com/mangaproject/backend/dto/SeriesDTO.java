package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeriesDTO {
    private String id;
    private String title;
    private String genre;
    private String synopsis;
    private String coverUrl;
    private String mangakaId;
    private String editorId;
    private String status;
    private String schedule;
    private String createdAt;
    private String updatedAt;
}