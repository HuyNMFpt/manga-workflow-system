package com.mangaproject.backend.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
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
    private String assignedEditorName;   // tên Editor được auto-assign (null nếu chưa có)
    private List<ManuscriptPageDTO> manuscriptPages; // trang bản thảo cho Board xem
    private String coverUrl;             // ảnh bìa series (null nếu chưa upload)
}