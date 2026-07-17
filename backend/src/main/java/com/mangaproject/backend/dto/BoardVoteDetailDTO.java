package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardVoteDetailDTO {
    private String voterId;
    private String voterName;
    private String vote;       // "approve" | "reject" | "abstain"
    private String comment;
    private String votedAt;
}
