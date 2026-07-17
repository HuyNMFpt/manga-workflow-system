package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.Manuscript;
import com.mangaproject.backend.model.Series;
import com.mangaproject.backend.model.Submission;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ManuscriptService {

    private final ManuscriptRepository manuscriptRepository;
    private final SubmissionRepository submissionRepository;
    private final SeriesRepository seriesRepository;
    private final FileStorageService fileStorageService;
    private final ManuscriptAnnotationRepository annotationRepository;
    private final UserRepository userRepository;

    public String uploadManuscriptFile(MultipartFile file) {
        try {
            return fileStorageService.storeFile(file, "manuscripts");
        } catch (Exception e) {
            log.error("Failed to upload manuscript file", e);
            throw new RuntimeException("Không thể upload file bản thảo: " + e.getMessage());
        }
    }

    @Transactional
    public SubmissionDTO createAndSubmit(CreateManuscriptRequest request, String userId) {
        Series series = seriesRepository.findById(request.getSeriesId())
                .orElseThrow(() -> new RuntimeException("Series not found"));

        if (!series.getMangakaId().equals(userId)) {
            throw new RuntimeException("Unauthorized: series does not belong to you");
        }

        // TODO 3: Không cho nộp bản thảo khi series đang publishing/on_hiatus/cancelled
        if (series.getStatus() == Series.SeriesStatus.publishing
                || series.getStatus() == Series.SeriesStatus.on_hiatus
                || series.getStatus() == Series.SeriesStatus.cancelled) {
            throw new RuntimeException(
                "Không thể nộp bản thảo cho series đang ở trạng thái: "
                + series.getStatus().name()
                + ". Chỉ nộp được khi series ở trạng thái draft hoặc đang xét duyệt."
            );
        }

        int nextVersion = manuscriptRepository
                .findTopBySeriesIdOrderByVersionDesc(request.getSeriesId())
                .map(m -> m.getVersion() + 1)
                .orElse(1);

        Manuscript manuscript = new Manuscript();
        manuscript.setSeriesId(request.getSeriesId());
        manuscript.setSubmittedBy(userId);
        manuscript.setVersion(nextVersion);
        manuscript.setFileUrl(request.getFileUrl() != null ? request.getFileUrl() : "pending_upload");
        manuscript.setDescription(buildDescription(request));
        manuscript.setStatus(Manuscript.ManuscriptStatus.submitted);
        manuscript.setSubmittedAt(LocalDateTime.now());
        manuscript = manuscriptRepository.save(manuscript);

        // Auto-assign Tantou Editor nếu series chưa có — chỉ gán khi editorId == null
        // không ghi đè nếu đã được assign từ trước (ví dụ admin gán tay)
        if (series.getEditorId() == null) {
            String assignedEditorId = findLeastLoadedEditor();
            if (assignedEditorId != null) {
                series.setEditorId(assignedEditorId);
                log.info("Auto-assigned editor {} to series {}", assignedEditorId, series.getId());
            } else {
                log.warn("No active editor found for auto-assign, series {} has no editor", series.getId());
            }
        }

        // under_editorial_review: Mangaka đã nộp, Editor đang xét (khác submitted = Editor đã nộp Board)
        series.setStatus(Series.SeriesStatus.under_editorial_review);
        seriesRepository.save(series);

        // TODO 2: Đếm số lần nộp bản thảo của series này (không phải của mangaka)
        int submissionRound = submissionRepository.countBySeriesId(request.getSeriesId()) + 1;

        Submission submission = new Submission();
        submission.setManuscriptId(manuscript.getId());
        submission.setSubmittedBy(userId);
        submission.setSubmissionRound(submissionRound);
        submission.setCoverLetter(request.getCoverLetter());
        submission.setStatus(Submission.SubmissionStatus.pending);
        submission.setVotingDeadline(LocalDateTime.now().plusDays(7));
        submission = submissionRepository.save(submission);

        // Refresh để lấy createdAt từ DB
        submission = submissionRepository.findById(submission.getId()).orElse(submission);

        log.info("Manuscript submitted: seriesId={}, version={}", request.getSeriesId(), nextVersion);
        return mapSubmissionToDTO(submission, series);
    }

    /**
     * Tìm Editor active có workload (số series đang active) thấp nhất.
     * Editor chưa có series nào → workload = 0, được ưu tiên chọn trước.
     */
    private String findLeastLoadedEditor() {
        List<User> editors = userRepository.findByRole_NameAndIsActiveTrue("editor");
        if (editors.isEmpty()) return null;

        // Build workload map: editorId → số series active đang được assign
        Map<String, Long> workload = seriesRepository.countActiveSeriesByEditor()
                .stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1]
                ));

        // Tìm editor có workload thấp nhất — editor chưa có series nào → getOrDefault trả 0
        return editors.stream()
                .min(Comparator.comparingLong(e -> workload.getOrDefault(e.getId(), 0L)))
                .map(User::getId)
                .orElse(null);
    }

    public List<SubmissionDTO> getMySubmissions(String userId) {
        return submissionRepository.findBySubmittedByOrderByCreatedAtDesc(userId).stream()
                .map(sub -> {
                    Manuscript ms = manuscriptRepository.findById(sub.getManuscriptId()).orElse(null);
                    Series s = ms != null ? seriesRepository.findById(ms.getSeriesId()).orElse(null) : null;
                    return mapSubmissionToDTO(sub, s);
                })
                .collect(Collectors.toList());
    }

    public List<ManuscriptDTO> getBySeriesId(String seriesId) {
        Series series = seriesRepository.findById(seriesId)
                .orElseThrow(() -> new RuntimeException("Series not found"));
        return manuscriptRepository.findBySeriesIdOrderByVersionDesc(seriesId).stream()
                .map(m -> mapManuscriptToDTO(m, series.getTitle()))
                .collect(Collectors.toList());
    }

    private String buildDescription(CreateManuscriptRequest req) {
        StringBuilder sb = new StringBuilder();
        if (req.getDescription() != null) sb.append(req.getDescription());
        if (req.getTargetAudience() != null)
            sb.append("\n[Target]: ").append(req.getTargetAudience());
        if (req.getPublicationSchedule() != null)
            sb.append("\n[Schedule]: ").append(req.getPublicationSchedule());
        if (req.getCharacterSummary() != null)
            sb.append("\n[Characters]: ").append(req.getCharacterSummary());
        return sb.toString();
    }

    private ManuscriptDTO mapManuscriptToDTO(Manuscript m, String seriesTitle) {
        List<AnnotationDTO> annotations = annotationRepository
                .findByManuscriptIdOrderByCreatedAtAsc(m.getId())
                .stream()
                .map(a -> new AnnotationDTO(
                        a.getId(), a.getNote(), a.getTag(),
                        a.getX(), a.getY(), a.getPageNumber(),
                        a.getCreatedAt() != null ? a.getCreatedAt().toString() : null,
                        userRepository.findById(a.getEditorId())
                                .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                                .orElse(null)
                ))
                .collect(Collectors.toList());

        Series series = seriesRepository.findById(m.getSeriesId()).orElse(null);
        return new ManuscriptDTO(
                m.getId(), m.getSeriesId(), seriesTitle,
                series != null ? series.getStatus().name() : null,
                m.getSubmittedBy(), m.getVersion(), m.getFileUrl(),
                m.getDescription(), m.getStatus().name(),
                m.getRejectionReason(),
                m.getSubmittedAt() != null ? m.getSubmittedAt().toString() : null,
                m.getCreatedAt() != null ? m.getCreatedAt().toString() : null,
                annotations
        );
    }

    private SubmissionDTO mapSubmissionToDTO(Submission s, Series series) {
        String manuscriptId = s.getManuscriptId();
        String seriesId = series != null ? series.getId() :
                manuscriptRepository.findById(manuscriptId)
                        .map(Manuscript::getSeriesId).orElse("");
        String seriesTitle = series != null ? series.getTitle() : "";

        // Resolve assignedEditorName
        String assignedEditorName = null;
        if (series != null && series.getEditorId() != null) {
            assignedEditorName = userRepository.findById(series.getEditorId())
                    .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                    .orElse(null);
        }

        return new SubmissionDTO(
                s.getId(), manuscriptId, seriesId, seriesTitle,
                s.getSubmittedBy(), s.getSubmissionRound(), s.getCoverLetter(),
                s.getStatus().name(), s.getVoteYes(), s.getVoteNo(), s.getVoteAbstain(),
                s.getVotingDeadline() != null ? s.getVotingDeadline().toString() : null,
                s.getCreatedAt() != null ? s.getCreatedAt().toString() : null,
                assignedEditorName
        );
    }
}