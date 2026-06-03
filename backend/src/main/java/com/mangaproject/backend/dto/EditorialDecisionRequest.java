package com.mangaproject.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EditorialDecisionRequest {
    @NotBlank
    private String seriesId;

    @NotBlank
    private String actionType; // cancel, change_schedule, hiatus, reinstate

    private String newSchedule; // weekly, monthly — khi actionType = change_schedule

    @NotBlank
    private String reason;

    private String effectiveDate; // yyyy-MM-dd
}
