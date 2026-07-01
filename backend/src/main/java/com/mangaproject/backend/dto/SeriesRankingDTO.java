package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeriesRankingDTO {
    private String seriesId;
    private String seriesTitle;
    private Integer currentRank;
    private Integer previousRank;
    private String trend;           // up, down, stable
    private Integer currentVotes;
    private Integer previousVotes;
    private boolean isAtRisk;
    private Integer consecutiveLowPeriods;
    private String lastUpdate;
    private Double readerScore;     // S — điểm thô 1-10 (null nếu chưa nhập)
    private Integer readerVoteCount;// v — số người chấm (null nếu chưa nhập)
    private Double weightedScore;   // R Bayesian — backend tính sẵn để frontend dùng cho sort/display
}