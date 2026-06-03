package com.mangaproject.backend.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EarningsDTO {
    private BigDecimal totalEarnings;
    private BigDecimal thisMonthEarnings;
    private int totalPagesApproved;
    private int thisMonthPagesApproved;
    private List<MonthlyEarning> monthlyHistory;
    private List<EarningByType> earningsByType;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyEarning {
        private String month;   // "2026-05"
        private BigDecimal earnings;
        private int pagesApproved;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EarningByType {
        private String taskType;
        private int count;
        private BigDecimal totalAmount;
    }
}
