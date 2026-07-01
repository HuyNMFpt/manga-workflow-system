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

    /**
     * Không còn dùng giá trị này nữa — backend tự tính rankPosition (#4 trong BACKEND_TODO_29062026).
     * Giữ field optional để không vỡ request nếu frontend còn gửi kèm (giá trị bị server ignore).
     */
    private Integer rankPosition;

    @NotNull
    private Integer voteCount;

    private Integer readerScore;
    private String notes;
    private String pollDate; // yyyy-MM-dd
}