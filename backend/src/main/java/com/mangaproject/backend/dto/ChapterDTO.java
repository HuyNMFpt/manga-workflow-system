package com.mangaproject.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChapterDTO {
    private String id;
    private String seriesId;
    private String seriesTitle;
    private Integer chapterNumber;
    private String title;
    private String notes;
    private String status;
    private String deadline; // "YYYY-MM-DD"
    private Integer totalPages;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PageDTO> pages;
}