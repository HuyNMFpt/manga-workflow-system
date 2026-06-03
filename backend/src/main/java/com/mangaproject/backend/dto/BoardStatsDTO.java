package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardStatsDTO {
    private int pendingVotes;         // submissions chờ vote
    private int totalActiveSeries;    // series đang publishing
    private int seriesAtRisk;         // series nguy hiểm
    private int decisionsThisMonth;   // quyết định tháng này
}
