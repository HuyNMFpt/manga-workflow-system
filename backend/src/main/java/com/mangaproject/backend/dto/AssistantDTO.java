package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssistantDTO {
    private String id;
    private String name;
    private String email;
    private String avatarUrl;
    private boolean isActive;
}
