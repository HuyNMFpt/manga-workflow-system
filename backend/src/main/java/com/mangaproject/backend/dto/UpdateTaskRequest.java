package com.mangaproject.backend.dto;

import lombok.Data;

@Data
public class UpdateTaskRequest {
    private String assignedTo;    // UUID assistant mới (optional)
    private String title;         // optional
    private String description;   // optional
    private String priority;      // low/normal/high/urgent (optional)
    private String dueDate;       // ISO date "yyyy-MM-dd" (optional)
    private java.math.BigDecimal paymentAmount; // optional — ghi đè đơn giá
}