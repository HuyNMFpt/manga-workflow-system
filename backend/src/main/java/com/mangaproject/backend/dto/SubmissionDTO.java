package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionDTO {
    private String id;
    private String manuscriptId;
    private String seriesId;
    private String seriesTitle;
    private String submittedBy;
    private Integer submissionRound;
    private String coverLetter;
    private String status;
    private Integer voteYes;
    private Integer voteNo;
    private Integer voteAbstain;
    private String votingDeadline;
    private String createdAt;
}
