package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.Task;
import com.mangaproject.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssistantService {

    private final TaskRepository taskRepository;

    // ── Stats cho Dashboard ───────────────────────────────────────
    public AssistantStatsDTO getStats(String assistantId) {
        List<Task> allTasks = taskRepository.findByAssignedTo(assistantId);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);

        int pending = 0, inProgress = 0, submitted = 0, approved = 0, revisionNeeded = 0, overdue = 0;

        for (Task t : allTasks) {
            switch (t.getStatus()) {
                case pending -> pending++;
                case in_progress -> inProgress++;
                case submitted -> submitted++;
                case approved -> approved++;
                case revision_needed -> revisionNeeded++;
            }
            if (t.getDueDate() != null && t.getDueDate().isBefore(now)
                    && t.getStatus() != Task.TaskStatus.approved) {
                overdue++;
            }
        }

        BigDecimal earningsThisMonth = allTasks.stream()
                .filter(t -> t.getStatus() == Task.TaskStatus.approved
                        && t.getApprovedAt() != null
                        && t.getApprovedAt().isAfter(startOfMonth)
                        && t.getPaymentAmount() != null)
                .map(Task::getPaymentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int pagesThisMonth = (int) allTasks.stream()
                .filter(t -> t.getStatus() == Task.TaskStatus.approved
                        && t.getApprovedAt() != null
                        && t.getApprovedAt().isAfter(startOfMonth))
                .count();

        return new AssistantStatsDTO(
                pending, inProgress, submitted, approved,
                revisionNeeded, overdue, earningsThisMonth, pagesThisMonth
        );
    }

    // ── Earnings chi tiết ────────────────────────────────────────
    public EarningsDTO getEarnings(String assistantId) {
        List<Task> allApproved = taskRepository.findApprovedByAssistant(assistantId);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);

        BigDecimal totalEarnings = allApproved.stream()
                .filter(t -> t.getPaymentAmount() != null)
                .map(Task::getPaymentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Task> thisMonthTasks = allApproved.stream()
                .filter(t -> t.getApprovedAt() != null && t.getApprovedAt().isAfter(startOfMonth))
                .collect(Collectors.toList());

        BigDecimal thisMonthEarnings = thisMonthTasks.stream()
                .filter(t -> t.getPaymentAmount() != null)
                .map(Task::getPaymentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Lịch sử 6 tháng
        List<EarningsDTO.MonthlyEarning> monthlyHistory = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM");
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = YearMonth.now().minusMonths(i);
            LocalDateTime start = ym.atDay(1).atStartOfDay();
            LocalDateTime end = ym.atEndOfMonth().atTime(23, 59, 59);

            List<Task> monthTasks = allApproved.stream()
                    .filter(t -> t.getApprovedAt() != null
                            && t.getApprovedAt().isAfter(start)
                            && t.getApprovedAt().isBefore(end))
                    .collect(Collectors.toList());

            BigDecimal monthEarnings = monthTasks.stream()
                    .filter(t -> t.getPaymentAmount() != null)
                    .map(Task::getPaymentAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            monthlyHistory.add(new EarningsDTO.MonthlyEarning(
                    ym.format(fmt), monthEarnings, monthTasks.size()
            ));
        }

        // Theo loại task
        Map<Task.TaskType, List<Task>> byType = allApproved.stream()
                .collect(Collectors.groupingBy(Task::getTaskType));

        List<EarningsDTO.EarningByType> earningsByType = byType.entrySet().stream()
                .map(e -> {
                    BigDecimal total = e.getValue().stream()
                            .filter(t -> t.getPaymentAmount() != null)
                            .map(Task::getPaymentAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new EarningsDTO.EarningByType(
                            e.getKey().name(), e.getValue().size(), total
                    );
                })
                .collect(Collectors.toList());

        return new EarningsDTO(
                totalEarnings, thisMonthEarnings,
                allApproved.size(), thisMonthTasks.size(),
                monthlyHistory, earningsByType
        );
    }
}
