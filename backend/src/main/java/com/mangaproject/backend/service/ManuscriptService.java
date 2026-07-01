package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.Manuscript;
import com.mangaproject.backend.model.Series;
import com.mangaproject.backend.model.Submission;
import com.mangaproject.backend.repository.ManuscriptRepository;
import com.mangaproject.backend.repository.SeriesRepository;
import com.mangaproject.backend.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ManuscriptService {

    private final ManuscriptRepository manuscriptRepository;
    private final SubmissionRepository submissionRepository;
    private final SeriesRepository seriesRepository;
    private final FileStorageService fileStorageService;
    private final com.mangaproject.backend.repository.ManuscriptAnnotationRepository annotationRepository;

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

        series.setStatus(Series.SeriesStatus.submitted);
        seriesRepository.save(series);

        int submissionRound = (int) submissionRepository
                .findBySubmittedByOrderByCreatedAtDesc(userId).size() + 1;

        Submission submission = new Submission();
        submission.setManuscriptId(manuscript.getId());
        submission.setSubmittedBy(userId);
        submission.setSubmissionRound(submissionRound);
        submission.setCoverLetter(request.getCoverLetter());
        submission.setStatus(Submission.SubmissionStatus.pending);
        submission.setVotingDeadline(LocalDateTime.now().plusDays(7));
        submission = submissionRepository.save(submission);

        // Refresh để lấy createdAt từ DB
        submission = submissionRepository.findById(submission.getId())
                .orElse(submission);

        log.info("Manuscript submitted: seriesId={}, version={}", request.getSeriesId(), nextVersion);
        return mapSubmissionToDTO(submission, series.getTitle());
    }

    public List<SubmissionDTO> getMySubmissions(String userId) {
        return submissionRepository.findBySubmittedByOrderByCreatedAtDesc(userId).stream()
                .map(sub -> {
                    Manuscript ms = manuscriptRepository.findById(sub.getManuscriptId()).orElse(null);
                    String seriesTitle = "";
                    if (ms != null) {
                        seriesTitle = seriesRepository.findById(ms.getSeriesId())
                                .map(Series::getTitle).orElse("");
                    }
                    return mapSubmissionToDTO(sub, seriesTitle);
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
        // Format chuẩn: [Key]: Value (dấu ] đứng sát Key, dấu : ở ngoài bracket)
        // Đây là format frontend regex đang tìm — đổi từ [Key: Value] cũ vì frontend
        // không parse được dạng đó, hiện raw text thay vì tách field riêng.
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
                        a.getCreatedAt() != null ? a.getCreatedAt().toString() : null
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

    private SubmissionDTO mapSubmissionToDTO(Submission s, String seriesTitle) {
        String manuscriptId = s.getManuscriptId();
        String seriesId = manuscriptRepository.findById(manuscriptId)
                .map(Manuscript::getSeriesId).orElse("");
        return new SubmissionDTO(
                s.getId(), manuscriptId, seriesId, seriesTitle,
                s.getSubmittedBy(), s.getSubmissionRound(), s.getCoverLetter(),
                s.getStatus().name(), s.getVoteYes(), s.getVoteNo(), s.getVoteAbstain(),
                s.getVotingDeadline() != null ? s.getVotingDeadline().toString() : null,
                s.getCreatedAt() != null ? s.getCreatedAt().toString() : null
        );
    }
}