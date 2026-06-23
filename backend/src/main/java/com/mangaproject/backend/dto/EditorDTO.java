package com.mangaproject.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EditorDTO {
    private String id;
    private String name;
    private String email;
    private String avatarUrl;
}
