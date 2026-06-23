package com.mangaproject.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RevisionRequest {
    @NotBlank
    private String note;
}