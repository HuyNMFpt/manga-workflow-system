package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    /**
     * GET /api/users/assistants
     * Lấy danh sách trợ lý để TaskAssignment hiển thị
     */
    @GetMapping("/assistants")
    public ApiResponse<List<AssistantDTO>> getAssistants() {
        List<AssistantDTO> assistants = userRepository
                .findByRole(User.UserRole.assistant).stream()
                .map(u -> new AssistantDTO(
                        u.getId(),
                        u.getName() != null ? u.getName() : u.getUsername(),
                        u.getEmail(),
                        u.getAvatarUrl(),
                        true
                ))
                .collect(Collectors.toList());
        return ApiResponse.success(assistants);
    }

    @GetMapping("/editors")
    public ApiResponse<List<EditorDTO>> getEditors() {
        List<EditorDTO> editors = userRepository
                .findByRole(User.UserRole.editor).stream()
                .map(u -> new EditorDTO(
                        u.getId(),
                        u.getName() != null ? u.getName() : u.getUsername(),
                        u.getEmail(),
                        u.getAvatarUrl()
                ))
                .collect(Collectors.toList());
        return ApiResponse.success(editors);
    }
}