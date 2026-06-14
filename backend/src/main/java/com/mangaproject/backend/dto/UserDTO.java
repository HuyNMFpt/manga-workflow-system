package com.mangaproject.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private String id;
    private String email;
    private String name;
    private String role;
    private String avatarUrl;
    private String createdAt;
    private String tempPassword; // chỉ trả về khi tạo mới
}