package com.mangaproject.backend.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class PollInputRequest {
    @NotBlank
    private String seriesId;

    @NotNull
    private Integer pollPeriod;

    @NotNull
    private Integer pollYear;

    /**
     * Không dùng — backend tự tính rankPosition từ voteCount.
     * Giữ optional để không vỡ request nếu frontend còn gửi kèm.
     */
    private Integer rankPosition;

    @NotNull
    private Integer voteCount;

    // Thang 1.0 – 10.0, optional
    @DecimalMin(value = "1.0", message = "Reader score phải từ 1.0 đến 10.0")
    @DecimalMax(value = "10.0", message = "Reader score phải từ 1.0 đến 10.0")
    private Double readerScore;

    // Số người đã chấm — dùng để tính R Bayesian, optional
    private Integer readerVoteCount;

    private String notes;
    private String pollDate; // yyyy-MM-dd
}