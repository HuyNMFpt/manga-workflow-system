package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionDetailDTO {
    private String submissionId;
    private String manuscriptId;
    private String seriesId;
    private String seriesTitle;
    private String seriesGenre;
    private String synopsis;
    private String mangakaId;
    private String mangakaName;
    private String fileUrl;
    private String description;
    private int submissionRound;
    private String coverLetter;
    private String status;
    private int voteYes;
    private int voteNo;
    private int voteAbstain;
    private String votingDeadline;
    private String createdAt;
    private boolean hasVoted;
    // Editor evaluation fields
    private String editorName;
    private String audienceSummary;
    private String marketingAngle;
    private String whyItWillSell;
    private String recommendedSchedule;
    private String editorNote;
}