package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReaderPollDTO {
    private String id;
    private String seriesId;
    private Integer pollPeriod;
    private Integer pollYear;
    private Integer rankPosition;
    private Integer voteCount;
    private String pollDate;
}
