package com.mangaproject.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageUploadRequest {

    @NotBlank(message = "Chapter ID is required")
    @Schema(description = "Chapter ID", example = "97549358-3379-44d0-baa1-4b7e88b258ca")
    private String chapterId;

    @NotNull(message = "Page number is required")
    @Min(value = 1, message = "Page number must be at least 1")
    @Schema(description = "Page number in chapter", example = "1")
    private Integer pageNumber;

    @NotNull(message = "Image file is required")
    @Schema(description = "Page image file (JPG, PNG)", type = "string", format = "binary")
    private MultipartFile file;

    @Schema(description = "Optional notes for this page", example = "Cover page")
    private String notes;
}