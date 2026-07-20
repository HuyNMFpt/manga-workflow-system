package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.UserRepository;
import com.mangaproject.backend.service.ManuscriptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/manuscripts")
@RequiredArgsConstructor
public class ManuscriptController {

    private final ManuscriptService manuscriptService;
    private final UserRepository userRepository;

    /**
     * POST /api/manuscripts/submit
     * Mangaka tạo manuscript + submit lên board trong 1 bước
     * Frontend SeriesSubmission gọi endpoint này khi bấm "Nộp hồ sơ"
     */
    @PostMapping(value = "/submit", consumes = {"multipart/form-data", "application/json"})
    public ApiResponse<SubmissionDTO> submitManuscript(
            @RequestParam(value = "seriesId") String seriesId,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "targetAudience", required = false) String targetAudience,
            @RequestParam(value = "publicationSchedule", required = false) String publicationSchedule,
            @RequestParam(value = "characterSummary", required = false) String characterSummary,
            @RequestParam(value = "plotSummary", required = false) String plotSummary,
            @RequestParam(value = "coverLetter", required = false) String coverLetter,
            @RequestParam(value = "fileUrl", required = false) String fileUrl,
            @RequestParam(value = "file", required = false) org.springframework.web.multipart.MultipartFile file,
            Authentication authentication) {

        User user = getUser(authentication);

        CreateManuscriptRequest request = new CreateManuscriptRequest();
        request.setSeriesId(seriesId);
        request.setDescription(description);
        request.setTargetAudience(targetAudience);
        request.setPublicationSchedule(publicationSchedule);
        request.setCharacterSummary(characterSummary);
        request.setPlotSummary(plotSummary);
        request.setCoverLetter(coverLetter);

        // Xử lý file upload
        if (file != null && !file.isEmpty()) {
            String uploadedUrl = manuscriptService.uploadManuscriptFile(file);
            request.setFileUrl(uploadedUrl);
        } else if (fileUrl != null && !fileUrl.startsWith("blob:")) {
            // Chỉ dùng fileUrl nếu không phải blob URL
            request.setFileUrl(fileUrl);
        } else {
            request.setFileUrl("pending_upload");
        }

        SubmissionDTO result = manuscriptService.createAndSubmit(request, user.getId());
        return ApiResponse.success(result, "Nộp hồ sơ thành công! Hội đồng biên tập sẽ xem xét trong 7 ngày.");
    }

    /**
     * GET /api/manuscripts/my-submissions
     * Mangaka xem danh sách submission của mình
     */
    @GetMapping("/my-submissions")
    public ApiResponse<List<SubmissionDTO>> getMySubmissions(Authentication authentication) {
        User user = getUser(authentication);
        return ApiResponse.success(manuscriptService.getMySubmissions(user.getId()));
    }

    /**
     * GET /api/manuscripts/series/{seriesId}
     * Lấy tất cả manuscript của 1 series
     */
    @GetMapping("/series/{seriesId}")
    public ApiResponse<List<ManuscriptDTO>> getBySeriesId(@PathVariable String seriesId) {
        return ApiResponse.success(manuscriptService.getBySeriesId(seriesId));
    }

    /**
     * GET /api/manuscripts/{id}/pages
     * Lấy danh sách trang bản thảo
     */
    @GetMapping("/{id}/pages")
    public ApiResponse<List<ManuscriptPageDTO>> getPages(@PathVariable String id) {
        return ApiResponse.success(manuscriptService.getPages(id));
    }

    /**
     * POST /api/manuscripts/{id}/pages/batch
     * Upload nhiều ảnh trang bản thảo cùng lúc
     */
    @PostMapping(value = "/{id}/pages/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<ManuscriptPageDTO>> uploadPages(
            @PathVariable String id,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "notes", required = false) String notes) {
        return ApiResponse.success(manuscriptService.uploadPages(id, files, notes),
                "Upload thành công " + files.size() + " trang bản thảo");
    }

    /**
     * POST /api/manuscripts/{id}/pages/upload-pdf
     * Upload PDF bản thảo — extract từng trang thành ảnh
     */
    @PostMapping(value = "/{id}/pages/upload-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<ManuscriptPageDTO>> uploadPdf(
            @PathVariable String id,
            @RequestParam("file") MultipartFile pdfFile) {
        if (!Objects.requireNonNull(pdfFile.getOriginalFilename()).toLowerCase().endsWith(".pdf")) {
            return new ApiResponse<>(null, "Chỉ chấp nhận file PDF", false);
        }
        List<ManuscriptPageDTO> result = manuscriptService.uploadPdf(id, pdfFile);
        return ApiResponse.success(result, "Upload PDF thành công — " + result.size() + " trang");
    }

    private User getUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}