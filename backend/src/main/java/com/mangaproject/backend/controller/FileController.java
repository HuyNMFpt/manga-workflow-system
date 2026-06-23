package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.ApiResponse;
import com.mangaproject.backend.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Slf4j
public class FileController {

    private final FileStorageService fileStorageService;

    /**
     * Upload file chung — dùng cho Assistant nộp kết quả task
     * POST /api/files/upload
     * multipart/form-data: file + folder (optional, default = "task-results")
     */
    @PostMapping("/upload")
    public ApiResponse<Map<String, String>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "task-results") String folder) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("File không được để trống");
            }

            // Validate file type
            String contentType = file.getContentType();
            if (contentType == null || (!contentType.startsWith("image/")
                    && !contentType.equals("application/pdf"))) {
                throw new RuntimeException("Chỉ chấp nhận file ảnh (PNG, JPG) hoặc PDF");
            }

            // Validate file size — max 10MB
            if (file.getSize() > 10 * 1024 * 1024) {
                throw new RuntimeException("File quá lớn, tối đa 10MB");
            }

            String url = fileStorageService.storeFile(file, folder);
            log.info("File uploaded: folder={}, url={}", folder, url);

            return ApiResponse.success(Map.of("url", url));
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Upload thất bại: " + e.getMessage());
        }
    }
}
