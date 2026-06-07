package com.mangaproject.backend.dto;

import lombok.Data;

@Data
public class SeriesMessageRequest {
    private String reason;
    private String requestedStatus; // optional: "draft", "publishing", etc.
}
