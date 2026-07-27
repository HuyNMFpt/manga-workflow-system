package com.mangaproject.backend.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
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
    private String deadlineDate;
    private String publishSchedule; // weekly|biweekly|monthly // ISO date string "YYYY-MM-DD" — frontend dùng để tính real-time countdown
    private int publishedChapters;            // TODO 2: số chapter đã published
    private int approvedChapters;             // TODO 2: số chapter approved (sẵn sàng xuất bản)
    private List<ChapterSummaryDTO> chapters; // TODO 2: danh sách chapters cho Editor chọn publish
}