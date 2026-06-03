package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EditorStatsDTO {
    private int manuscriptsInReview;    // bản thảo đang xét
    private int seriesSerializing;      // series đang xuất bản
    private int seriesAtRisk;           // series nguy hiểm
    private int deadlinesThisWeek;      // deadline tuần này
}
