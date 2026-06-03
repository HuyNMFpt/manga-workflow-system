package com.mangaproject.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class PollInputRequest {
    @NotBlank
    private String seriesId;

    @NotNull
    private Integer pollPeriod;

    @NotNull
    private Integer pollYear;

    @NotNull
    private Integer rankPosition;

    @NotNull
    private Integer voteCount;

    private Integer readerScore;
    private String notes;
    private String pollDate; // yyyy-MM-dd
}
