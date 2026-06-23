package com.mangaproject.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class UserDTO {
    private String id;
    private String email;
    private String name;
    private String role;
    private String avatarUrl;
    private String createdAt;
    private Boolean isActive;
    private String tempPassword;
    private String personalEmail;
}