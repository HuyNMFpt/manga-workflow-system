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
    private String trend;          // up, down, stable
    private Integer currentVotes;
    private Integer previousVotes;
    private boolean isAtRisk;
    private Integer consecutiveLowPeriods;
    private String lastUpdate;
    private Integer readerScore;
}