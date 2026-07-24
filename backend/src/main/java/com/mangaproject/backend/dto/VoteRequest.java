package com.mangaproject.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VoteRequest {
    @NotBlank
    private String submissionId;

    @NotBlank
    private String decision; // approve, reject, revision

    @NotBlank
    @Size(min = 50, message = "Justification phải ít nhất 50 ký tự")
    private String justification;

    private String schedule;          // weekly | biweekly | monthly — khi decision = approve
    private String publishStartDate;  // "YYYY-MM-DD" — khi decision = approve
}