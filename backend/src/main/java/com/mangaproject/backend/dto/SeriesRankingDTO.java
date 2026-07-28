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
    private Integer publishOnTimeRate;   // % chapter xuất bản đúng hạn
    private Integer publishTotalCount;   // tổng chapter đã published
    private Integer publishAvgDaysLate;  // trung bình số ngày trễ (null nếu không có trễ)
    private String seriesStatus;         // publishing / on_hiatus / cancelled — frontend filter action buttons
    private String latestPollId;    // ID poll mới nhất — dùng cho PUT /rankings/{id} khi sửa
    private Integer latestPollPeriod; // kỳ của poll mới nhất — hiển thị trên form sửa
    private Integer latestPollYear;   // năm của poll mới nhất — hiển thị trên form sửa
}