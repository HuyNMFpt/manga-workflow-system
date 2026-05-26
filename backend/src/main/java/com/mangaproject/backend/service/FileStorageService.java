package com.mangaproject.backend.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface FileStorageService {

    /**
     * Store uploaded file and return URL
     * @param file Uploaded file
     * @param folder Folder path (e.g., "chapters/1/pages")
     * @return URL to access the file
     */
    String storeFile(MultipartFile file, String folder) throws IOException;

    /**
     * Delete file by URL
     * @param fileUrl File URL to delete
     */
    void deleteFile(String fileUrl) throws IOException;

    /**
     * Generate thumbnail from image
     * @param file Original image file
     * @param folder Folder path
     * @return URL to thumbnail
     */
    String storeThumbnail(MultipartFile file, String folder) throws IOException;
}