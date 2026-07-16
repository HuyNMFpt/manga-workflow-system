package com.mangaproject.backend.service;

import com.mangaproject.backend.model.Series;
import com.mangaproject.backend.model.Submission;
import com.mangaproject.backend.repository.SeriesRepository;
import com.mangaproject.backend.repository.SubmissionRepository;
import com.mangaproject.backend.repository.ManuscriptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class VotingDeadlineScheduler {

    private final SubmissionRepository submissionRepository;
    private final SeriesRepository seriesRepository;
    private final ManuscriptRepository manuscriptRepository;

    /**
     * Chạy mỗi ngày lúc 2 giờ sáng
     * Tự động reject submission quá hạn mà chưa đủ phiếu (< 3 phiếu tổng)
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void rejectExpiredSubmissions() {
        LocalDateTime now = LocalDateTime.now();

        List<Submission> expired = submissionRepository
                .findByStatusInAndVotingDeadlineBefore(
                        List.of(Submission.SubmissionStatus.pending,
                                Submission.SubmissionStatus.voting),
                        now
                );

        if (expired.isEmpty()) {
            log.info("VotingDeadlineScheduler: No expired submissions found");
            return;
        }

        log.warn("VotingDeadlineScheduler: Found {} expired submissions", expired.size());

        for (Submission sub : expired) {
            int totalVotes = sub.getVoteYes() + sub.getVoteNo() + sub.getVoteAbstain();

            // Chỉ reject nếu chưa đủ quorum (< 3 phiếu tổng)
            if (totalVotes < 3) {
                sub.setStatus(Submission.SubmissionStatus.rejected);
                submissionRepository.save(sub);

                // Cập nhật series về trạng thái cũ
                manuscriptRepository.findById(sub.getManuscriptId()).ifPresent(ms -> {
                    seriesRepository.findById(ms.getSeriesId()).ifPresent(series -> {
                        series.setStatus(Series.SeriesStatus.under_editorial_review);
                        seriesRepository.save(series);
                        log.warn("Submission {} expired and rejected for series: {}",
                                sub.getId(), series.getTitle());
                    });
                });
            }
        }
    }
}
