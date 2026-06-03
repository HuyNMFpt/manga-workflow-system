package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.*;
import com.mangaproject.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EditorService {

    private final SeriesRepository seriesRepository;
    private final ManuscriptRepository manuscriptRepository;
    private final ChapterRepository chapterRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    // ── Dashboard stats ──────────────────────────────────────────
    public EditorStatsDTO getStats(String editorId) {
        // Bản thảo đang xét (submitted manuscripts của series editor này phụ trách)
        List<Series> mySeries = seriesRepository.findByEditorId(editorId);
        List<String> seriesIds = mySeries.stream().map(Series::getId).collect(Collectors.toList());

        int manuscriptsInReview = 0;
        for (String sid : seriesIds) {
            manuscriptsInReview += manuscriptRepository
                    .findBySeriesIdOrderByVersionDesc(sid).stream()
                    .filter(m -> m.getStatus() == Manuscript.ManuscriptStatus.submitted
                            || m.getStatus() == Manuscript.ManuscriptStatus.under_review)
                    .count();
        }

        int seriesSerializing = (int) mySeries.stream()
                .filter(s -> s.getStatus() == Series.SeriesStatus.publishing)
                .count();

        int seriesAtRisk = (int) mySeries.stream()
                .filter(s -> s.getCancellationRisk() != null && s.getCancellationRisk())
                .count();

        // Deadline tuần này: chapters có deadline trong 7 ngày tới
        LocalDateTime nextWeek = LocalDateTime.now().plusDays(7);
        int deadlinesThisWeek = 0;
        for (String sid : seriesIds) {
            deadlinesThisWeek += chapterRepository.findBySeriesIdOrderByChapterNumberAsc(sid).stream()
                    .filter(c -> c.getDeadline() != null
                            && c.getDeadline().atStartOfDay().isBefore(nextWeek)
                            && c.getStatus() != Chapter.ChapterStatus.published)
                    .count();
        }

        return new EditorStatsDTO(manuscriptsInReview, seriesSerializing, seriesAtRisk, deadlinesThisWeek);
    }

    // ── Studio Progress — tiến độ real-time ──────────────────────
    public List<StudioProgressDTO> getStudioProgress(String editorId) {
        List<Series> mySeries = seriesRepository.findByEditorId(editorId);
        List<StudioProgressDTO> result = new ArrayList<>();

        for (Series series : mySeries) {
            if (series.getStatus() != Series.SeriesStatus.publishing) continue;

            // Lấy chapter đang làm gần nhất
            List<Chapter> chapters = chapterRepository.findBySeriesIdOrderByChapterNumberAsc(series.getId());
            Chapter latestChapter = chapters.stream()
                    .filter(c -> c.getStatus() != Chapter.ChapterStatus.published)
                    .findFirst()
                    .orElse(chapters.isEmpty() ? null : chapters.get(chapters.size() - 1));

            if (latestChapter == null) continue;

            // Đếm tasks
            List<Task> tasks = taskRepository.findByChapterId(latestChapter.getId());
            int total = tasks.size();
            int completed = (int) tasks.stream().filter(t -> t.getStatus() == Task.TaskStatus.approved).count();
            int inProgress = (int) tasks.stream().filter(t -> t.getStatus() == Task.TaskStatus.in_progress || t.getStatus() == Task.TaskStatus.submitted).count();
            int pending = (int) tasks.stream().filter(t -> t.getStatus() == Task.TaskStatus.pending).count();

            // Quá hạn
            LocalDateTime now = LocalDateTime.now();
            int overdue = (int) tasks.stream()
                    .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(now)
                            && t.getStatus() != Task.TaskStatus.approved)
                    .count();

            // Days until deadline
            int daysLeft = latestChapter.getDeadline() != null
                    ? (int) java.time.temporal.ChronoUnit.DAYS.between(
                            java.time.LocalDate.now(), latestChapter.getDeadline())
                    : 999;

            // Danh sách assistant
            List<String> assistantNames = tasks.stream()
                    .map(Task::getAssignedTo)
                    .distinct()
                    .map(uid -> userRepository.findById(uid)
                            .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                            .orElse("Unknown"))
                    .collect(Collectors.toList());

            double percent = total > 0 ? (double) completed / total * 100 : 0;

            // Mangaka name
            String mangakaName = userRepository.findById(series.getMangakaId())
                    .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                    .orElse("Unknown");

            result.add(new StudioProgressDTO(
                    series.getId(), series.getTitle(), series.getGenre(),
                    series.getMangakaId(), mangakaName,
                    latestChapter.getChapterNumber(),
                    total, completed, inProgress, pending, overdue,
                    daysLeft, daysLeft <= 3 || overdue > 0,
                    Math.round(percent * 10.0) / 10.0,
                    assistantNames
            ));
        }

        return result;
    }

    // ── Manuscripts để review ────────────────────────────────────
    public List<ManuscriptDTO> getManuscriptsToReview(String editorId) {
        List<Series> mySeries = seriesRepository.findByEditorId(editorId);
        List<ManuscriptDTO> result = new ArrayList<>();

        for (Series series : mySeries) {
            manuscriptRepository.findBySeriesIdOrderByVersionDesc(series.getId()).stream()
                    .filter(m -> m.getStatus() == Manuscript.ManuscriptStatus.submitted
                            || m.getStatus() == Manuscript.ManuscriptStatus.under_review)
                    .map(m -> new ManuscriptDTO(
                            m.getId(), m.getSeriesId(), series.getTitle(),
                            m.getSubmittedBy(), m.getVersion(), m.getFileUrl(),
                            m.getDescription(), m.getStatus().name(),
                            m.getRejectionReason(),
                            m.getSubmittedAt() != null ? m.getSubmittedAt().toString() : null,
                            m.getCreatedAt() != null ? m.getCreatedAt().toString() : null
                    ))
                    .forEach(result::add);
        }

        return result;
    }

    // ── Editor thêm annotation/comment lên manuscript ────────────
    public ManuscriptDTO addAnnotation(String manuscriptId, String editorId, String note) {
        Manuscript manuscript = manuscriptRepository.findById(manuscriptId)
                .orElseThrow(() -> new RuntimeException("Manuscript not found"));

        // Append note vào description
        String existing = manuscript.getDescription() != null ? manuscript.getDescription() : "";
        manuscript.setDescription(existing + "\n[Editor note]: " + note);
        manuscript.setStatus(Manuscript.ManuscriptStatus.under_review);
        manuscript = manuscriptRepository.save(manuscript);

        Series series = seriesRepository.findById(manuscript.getSeriesId()).orElse(null);
        String seriesTitle = series != null ? series.getTitle() : "";

        return new ManuscriptDTO(
                manuscript.getId(), manuscript.getSeriesId(), seriesTitle,
                manuscript.getSubmittedBy(), manuscript.getVersion(), manuscript.getFileUrl(),
                manuscript.getDescription(), manuscript.getStatus().name(),
                manuscript.getRejectionReason(),
                manuscript.getSubmittedAt() != null ? manuscript.getSubmittedAt().toString() : null,
                manuscript.getCreatedAt() != null ? manuscript.getCreatedAt().toString() : null
        );
    }
}
