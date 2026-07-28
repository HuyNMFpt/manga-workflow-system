package com.mangaproject.backend.dto;

import lombok.Data;

@Data
public class DecideRequest {
    private String submissionId;
    private String decision;           // "approve" | "reject"
    private String reason;             // lý do (bắt buộc khi reject)
    private String publishSchedule;    // weekly|biweekly|monthly (bắt buộc khi approve)
    private String publishStartDate;   // yyyy-MM-dd (bắt buộc khi approve)
}
