package com.mangaproject.backend.dto;

import lombok.Data;

@Data
public class UpdateManuscriptStatusRequest {
    private String status; // needs_minor_revision | needs_major_revision | under_review
    private String reason;
}
