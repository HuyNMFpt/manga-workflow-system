package com.mangaproject.backend.dto;

import lombok.Data;

@Data
public class AnnotateRequest {
    private String note;
    private Double x;          // % horizontal (optional)
    private Double y;          // % vertical (optional)
    private String tag;        // story | dialogue | art | pacing | layout (optional)
    private Integer pageNumber; // số trang (optional)
}
