package com.mangaproject.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateManuscriptRequest {
    @NotBlank
    private String seriesId;

    @NotBlank
    private String fileUrl;

    private String description;

    // Thông tin series submission (từ form SeriesSubmission frontend)
    private String targetAudience;
    private String publicationSchedule;
    private String characterSummary;
    private String plotSummary;

    // Cover letter khi submit lên board
    private String coverLetter;
}
