package com.mangaproject.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@Slf4j
public class LocalFileStorageService implements FileStorageService {

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @Value("${file.base-url:http://localhost:8080}")
    private String baseUrl;

    private static final int THUMBNAIL_WIDTH = 300;
    private static final int THUMBNAIL_HEIGHT = 400;

    @Override
    public String storeFile(MultipartFile file, String folder) throws IOException {
        // Validate file
        if (file.isEmpty()) {
            throw new IOException("Failed to store empty file");
        }

        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IOException("Only image files are allowed");
        }

        // Create directory
        Path uploadPath = Paths.get(uploadDir, folder);
        Files.createDirectories(uploadPath);

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : ".jpg";
        String filename = UUID.randomUUID().toString() + extension;

        // Save file
        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Return URL
        String fileUrl = baseUrl + "/uploads/" + folder + "/" + filename;
        log.info("File stored successfully: {}", fileUrl);
        return fileUrl;
    }

    @Override
    public void deleteFile(String fileUrl) throws IOException {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }

        try {
            // Extract file path from URL
            String relativePath = fileUrl.replace(baseUrl + "/uploads/", "");
            Path filePath = Paths.get(uploadDir, relativePath);

            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("File deleted successfully: {}", fileUrl);
            }
        } catch (Exception e) {
            log.error("Failed to delete file: {}", fileUrl, e);
            throw new IOException("Failed to delete file", e);
        }
    }

    @Override
    public String storeThumbnail(MultipartFile file, String folder) throws IOException {
        // Read original image
        BufferedImage originalImage = ImageIO.read(file.getInputStream());
        if (originalImage == null) {
            throw new IOException("Failed to read image");
        }

        // Create thumbnail
        BufferedImage thumbnail = createThumbnail(originalImage);

        // Convert to byte array
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(thumbnail, "jpg", baos);
        byte[] thumbnailBytes = baos.toByteArray();

        // Create directory
        Path uploadPath = Paths.get(uploadDir, folder, "thumbnails");
        Files.createDirectories(uploadPath);

        // Generate filename
        String filename = "thumb_" + UUID.randomUUID().toString() + ".jpg";
        Path filePath = uploadPath.resolve(filename);

        // Save thumbnail
        Files.write(filePath, thumbnailBytes);

        // Return URL
        String thumbnailUrl = baseUrl + "/uploads/" + folder + "/thumbnails/" + filename;
        log.info("Thumbnail stored successfully: {}", thumbnailUrl);
        return thumbnailUrl;
    }

    private BufferedImage createThumbnail(BufferedImage originalImage) {
        int originalWidth = originalImage.getWidth();
        int originalHeight = originalImage.getHeight();

        // Calculate scaled dimensions maintaining aspect ratio
        double scale = Math.min(
                (double) THUMBNAIL_WIDTH / originalWidth,
                (double) THUMBNAIL_HEIGHT / originalHeight
        );

        int scaledWidth = (int) (originalWidth * scale);
        int scaledHeight = (int) (originalHeight * scale);

        // Create thumbnail
        BufferedImage thumbnail = new BufferedImage(
                scaledWidth, scaledHeight, BufferedImage.TYPE_INT_RGB
        );

        Graphics2D g = thumbnail.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(originalImage, 0, 0, scaledWidth, scaledHeight, null);
        g.dispose();

        return thumbnail;
    }
}