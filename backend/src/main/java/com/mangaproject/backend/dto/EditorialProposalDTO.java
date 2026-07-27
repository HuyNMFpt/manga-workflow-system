package com.mangaproject.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EditorialProposalDTO {
    private String id;
    private String seriesId;
    private String seriesTitle;
    private String actionType;
    private String newSchedule;
    private String reason;
    private String proposedByName;
    private int voteYes;
    private int voteNo;
    private int voteAbstain;
    private String status;
    private boolean hasVoted;
    private String createdAt;
    private String decidedAt;  // TODO 1: thời điểm quyết định
    private int totalVotes;    // TODO 1: tổng phiếu đã bỏ
    private int quorum;        // TODO 1: ngưỡng quorum động
    private String votingDeadline; // deadline bỏ phiếu — frontend countdown
}