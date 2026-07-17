package com.mangaproject.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateProposalRequest {
    @NotBlank
    private String seriesId;

    @NotBlank
    private String actionType; // cancel, hiatus, reinstate, change_schedule

    private String newSchedule; // chỉ dùng khi actionType = change_schedule

    @NotBlank
    @Size(min = 20, message = "Lý do đề xuất phải ít nhất 20 ký tự")
    private String reason;
}
