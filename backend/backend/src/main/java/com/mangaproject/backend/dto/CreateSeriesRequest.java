package com.mangaproject.backend.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateSeriesRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String genre;

    @NotBlank
    private String synopsis;

    private String coverUrl;

    private String schedule; // weekly, monthly, one_shot
}