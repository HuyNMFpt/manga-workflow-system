package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EditorialVoteDetailDTO {
    private String voterId;
    private String voterName;
    private String vote;      // yes | no | abstain
    private String comment;
    private String votedAt;
}