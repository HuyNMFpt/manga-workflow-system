package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChapterSummaryDTO {
    private String id;
    private Integer chapterNumber;
    private String title;
    private String status;
    private Integer totalPages;
    private String deadline;
    private String publishedAt;
}