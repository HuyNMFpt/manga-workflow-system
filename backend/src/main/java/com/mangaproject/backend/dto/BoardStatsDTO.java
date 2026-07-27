package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardStatsDTO {
    private int pendingVotes;                  // submissions chờ vote
    private int totalActiveSeries;             // series đang publishing
    private int seriesAtRisk;                  // series nguy hiểm
    private int decisionsThisMonth;            // quyết định submission tháng này
    private int approvedProposals;             // TODO 2: proposals đã thông qua tháng này
    private int publishedChaptersThisMonth;    // TODO 2: chapters được xuất bản tháng này
}