package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardVoteDetailDTO {
    private String voterId;
    private String voterName;
    private String vote;       // "yes" | "no" | "abstain"
    private String comment;
    private String schedule;   // weekly/biweekly/monthly member đề xuất
    private String votedAt;
}