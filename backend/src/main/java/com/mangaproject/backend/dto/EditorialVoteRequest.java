package com.mangaproject.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EditorialVoteRequest {
    @NotBlank
    private String proposalId;

    @NotBlank
    private String decision; // yes, no, abstain

    private String comment;
}
