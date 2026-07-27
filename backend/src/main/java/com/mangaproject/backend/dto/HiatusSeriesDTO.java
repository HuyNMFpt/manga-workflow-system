package com.mangaproject.backend.dto;

import lombok.*;

/**
 * DTO cho series đang on_hiatus — xuất hiện trong GET /board/at-risk
 * để Board có thể tạo proposal phục hồi (reinstate) hoặc cancel hẳn.
 * Frontend DecisionPanel dùng field seriesStatus để filter action buttons.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HiatusSeriesDTO {
    private String seriesId;
    private String seriesTitle;
    private String seriesStatus;       // on_hiatus
    private String genre;
    private String mangakaName;
    private String editorName;
    private Integer currentRank;
    private Integer currentVotes;
    private Integer publishTotalCount;
    private Integer publishOnTimeRate;
    private Integer publishAvgDaysLate;
    private String lastUpdate;
    private boolean hasActiveProposal; // đã có proposal voting chưa — ẩn nút tạo mới
}
