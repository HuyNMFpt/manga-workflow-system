package com.mangaproject.backend.service;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.*;
import com.mangaproject.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ManuscriptService {

    private final ManuscriptRepository manuscriptRepository;
    private final ManuscriptPageRepository manuscriptPageRepository;
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
        if (!List.of(
                Series.SeriesStatus.draft,
                Series.SeriesStatus.under_editorial_review,
                Series.SeriesStatus.rejected
        ).contains(series.getStatus())) {
            throw new RuntimeException(
                    "Không thể nộp bản thảo cho series đang ở trạng thái: "
                            + series.getStatus().name()
                            + ". Chỉ nộp được khi series ở trạng thái draft, đang xét duyệt, hoặc đã bị từ chối."
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

    // ── Upload trang bản thảo — batch ảnh ──────────────────────────
    @Transactional
    public List<ManuscriptPageDTO> uploadPages(String manuscriptId,
                                               List<MultipartFile> files, String notes) {
        manuscriptRepository.findById(manuscriptId)
                .orElseThrow(() -> new RuntimeException("Manuscript not found"));

        int nextPage = manuscriptPageRepository.findMaxPageNumber(manuscriptId)
                .map(max -> max + 1).orElse(1);

        List<ManuscriptPageDTO> result = new ArrayList<>();
        for (MultipartFile file : files) {
            try {
                String folder = "manuscripts/" + manuscriptId + "/pages";
                String imageUrl = fileStorageService.storeFile(file, folder);
                String thumbUrl = fileStorageService.storeThumbnail(file, folder);

                ManuscriptPage page = new ManuscriptPage();
                page.setManuscriptId(manuscriptId);
                page.setPageNumber(nextPage++);
                page.setImageUrl(imageUrl);
                page.setThumbnailUrl(thumbUrl);
                page.setNotes(notes);
                result.add(mapPageToDTO(manuscriptPageRepository.save(page)));
            } catch (IOException e) {
                throw new RuntimeException("Upload trang " + nextPage + " thất bại: " + e.getMessage());
            }
        }
        log.info("Manuscript batch upload: id={}, pages={}", manuscriptId, result.size());
        return result;
    }

    // ── Upload PDF — extract từng trang thành ảnh ────────────────
    @Transactional
    public List<ManuscriptPageDTO> uploadPdf(String manuscriptId, MultipartFile pdfFile) {
        manuscriptRepository.findById(manuscriptId)
                .orElseThrow(() -> new RuntimeException("Manuscript not found"));

        int nextPage = manuscriptPageRepository.findMaxPageNumber(manuscriptId)
                .map(max -> max + 1).orElse(1);

        List<ManuscriptPageDTO> result = new ArrayList<>();
        try (PDDocument document = Loader.loadPDF(pdfFile.getBytes())) {
            PDFRenderer renderer = new PDFRenderer(document);
            for (int i = 0; i < document.getNumberOfPages(); i++) {
                BufferedImage image = renderer.renderImageWithDPI(i, 150, ImageType.RGB);

                // Nền trắng (tránh PDF transparent → ảnh đen)
                BufferedImage white = new BufferedImage(
                        image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
                java.awt.Graphics2D g = white.createGraphics();
                g.setColor(java.awt.Color.WHITE);
                g.fillRect(0, 0, image.getWidth(), image.getHeight());
                g.drawImage(image, 0, 0, null);
                g.dispose();

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(white, "jpg", baos);

                MultipartFile mockFile = new ByteArrayMultipartFile(
                        "page_" + (i + 1) + ".jpg", "image/jpeg", baos.toByteArray());

                String folder = "manuscripts/" + manuscriptId + "/pages";
                String imageUrl = fileStorageService.storeFile(mockFile, folder);
                String thumbUrl = fileStorageService.storeThumbnail(mockFile, folder);

                ManuscriptPage page = new ManuscriptPage();
                page.setManuscriptId(manuscriptId);
                page.setPageNumber(nextPage + i);
                page.setImageUrl(imageUrl);
                page.setThumbnailUrl(thumbUrl);
                page.setNotes("PDF trang " + (i + 1));
                result.add(mapPageToDTO(manuscriptPageRepository.save(page)));

                log.info("Manuscript PDF extract: id={}, page={}/{}", manuscriptId, i + 1, document.getNumberOfPages());
            }
        } catch (IOException e) {
            throw new RuntimeException("Upload PDF thất bại: " + e.getMessage());
        }
        return result;
    }

    // ── Lấy danh sách trang bản thảo ────────────────────────────
    public List<ManuscriptPageDTO> getPages(String manuscriptId) {
        return manuscriptPageRepository.findByManuscriptIdOrderByPageNumberAsc(manuscriptId)
                .stream().map(this::mapPageToDTO).collect(Collectors.toList());
    }

    private ManuscriptPageDTO mapPageToDTO(ManuscriptPage p) {
        return new ManuscriptPageDTO(
                p.getId(), p.getManuscriptId(), p.getPageNumber(),
                p.getImageUrl(), p.getThumbnailUrl(), p.getNotes());
    }

    // ── ByteArrayMultipartFile — wrap byte[] thành MultipartFile ──
    private static class ByteArrayMultipartFile implements MultipartFile {
        private final String name;
        private final String contentType;
        private final byte[] content;
        public ByteArrayMultipartFile(String name, String contentType, byte[] content) {
            this.name = name; this.contentType = contentType; this.content = content;
        }
        @Override public String getName() { return name; }
        @Override public String getOriginalFilename() { return name; }
        @Override public String getContentType() { return contentType; }
        @Override public boolean isEmpty() { return content.length == 0; }
        @Override public long getSize() { return content.length; }
        @Override public byte[] getBytes() { return content; }
        @Override public InputStream getInputStream() { return new ByteArrayInputStream(content); }
        @Override public void transferTo(java.io.File dest) throws IOException {
            java.nio.file.Files.write(dest.toPath(), content);
        }
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

        List<ManuscriptPageDTO> pages = manuscriptPageRepository
                .findByManuscriptIdOrderByPageNumberAsc(m.getId())
                .stream().map(this::mapPageToDTO).collect(Collectors.toList());

        ManuscriptDTO dto = new ManuscriptDTO(
                m.getId(), m.getSeriesId(), seriesTitle,
                series != null ? series.getStatus().name() : null,
                m.getSubmittedBy(), m.getVersion(), m.getFileUrl(),
                m.getDescription(), m.getStatus().name(),
                m.getRejectionReason(),
                m.getSubmittedAt() != null ? m.getSubmittedAt().toString() : null,
                m.getCreatedAt() != null ? m.getCreatedAt().toString() : null,
                annotations,
                pages
        );
        return dto;
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