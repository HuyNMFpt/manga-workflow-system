package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private String id;
    private String userId;
    private String message;
    private String referenceId;
    private String referenceType;
    private String type;
    private Boolean isRead;
    private String createdAt;
}
