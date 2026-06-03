package com.mangaproject.backend.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssistantStatsDTO {
    private int totalPending;        // task chờ làm
    private int totalInProgress;     // đang làm
    private int totalSubmitted;      // đã nộp
    private int totalApproved;       // đã duyệt
    private int totalRevisionNeeded; // cần sửa
    private int totalOverdue;        // quá hạn
    private BigDecimal earningsThisMonth;
    private int pagesApprovedThisMonth;
}
