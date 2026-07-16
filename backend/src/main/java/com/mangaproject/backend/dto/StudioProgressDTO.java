package com.mangaproject.backend.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudioProgressDTO {
    private String seriesId;
    private String seriesTitle;
    private String genre;
    private String mangakaId;
    private String mangakaName;
    private int currentChapter;
    private int totalPages;
    private int completedPages;
    private int inProgressPages;
    private int pendingPages;
    private int overdueTasks;
    private int daysUntilDeadline;
    private boolean isUrgent;
    private double completionPercent;
    private List<String> assistantNames;
    private String deadlineDate; // ISO date string "YYYY-MM-DD" — frontend dùng để tính real-time countdown
}