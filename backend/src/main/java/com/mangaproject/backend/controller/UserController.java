package com.mangaproject.backend.controller;

import com.mangaproject.backend.dto.*;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.TaskRepository;
import com.mangaproject.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    // ── GET /api/users/me ────────────────────────────────────────
    @GetMapping("/me")
    public ApiResponse<UserDTO> getMe(Authentication authentication) {
        String email = (String) authentication.getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ApiResponse.success(mapUserToDTO(user));
    }

    // ── PUT /api/users/me/skills ─────────────────────────────────
    // Frontend gửi { taskTypes: [...] } — nhận cả 2 key để tương thích
    @PutMapping("/me/skills")
    public ApiResponse<UserDTO> updateSkills(
            @RequestBody Map<String, List<String>> body,
            Authentication authentication) {
        String email = (String) authentication.getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Frontend gửi "taskTypes", nhận cả "skills" để tương thích
        List<String> skills = body.containsKey("taskTypes")
                ? body.get("taskTypes")
                : body.get("skills");

        if (skills != null) {
            user.setSkills("[" + skills.stream()
                    .map(s -> "\"" + s + "\"")
                    .collect(Collectors.joining(",")) + "]");
            userRepository.save(user);
        }
        return ApiResponse.success(mapUserToDTO(user), "Kỹ năng đã được cập nhật");
    }

    // ── GET /api/users/assistants ────────────────────────────────
    @GetMapping("/assistants")
    public ApiResponse<List<AssistantDTO>> getAssistants() {
        List<User> users = userRepository.findByRole_Name("assistant");
        List<String> ids = users.stream().map(User::getId).toList();

        Map<String, Long> countMap = ids.isEmpty()
                ? Map.of()
                : taskRepository.countActiveTasksByAssistants(ids)
                .stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1]));

        List<AssistantDTO> assistants = users.stream()
                .map(u -> new AssistantDTO(
                        u.getId(),
                        u.getName() != null ? u.getName() : u.getUsername(),
                        u.getEmail(),
                        u.getAvatarUrl(),
                        Boolean.TRUE.equals(u.getIsActive()),
                        countMap.getOrDefault(u.getId(), 0L),
                        parseSkills(u.getSkills())))
                .collect(Collectors.toList());
        return ApiResponse.success(assistants);
    }

    // ── GET /api/users/editors ───────────────────────────────────
    @GetMapping("/editors")
    public ApiResponse<List<EditorDTO>> getEditors() {
        List<EditorDTO> editors = userRepository
                .findByRole_Name("editor").stream()
                .map(u -> new EditorDTO(
                        u.getId(),
                        u.getName() != null ? u.getName() : u.getUsername(),
                        u.getEmail(),
                        u.getAvatarUrl()))
                .collect(Collectors.toList());
        return ApiResponse.success(editors);
    }

    // ── Helpers ──────────────────────────────────────────────────
    private List<String> parseSkills(String skillsJson) {
        if (skillsJson == null || skillsJson.isBlank() || skillsJson.equals("[]"))
            return Collections.emptyList();
        String stripped = skillsJson.trim().replaceAll("^\\[|\\]$", "");
        if (stripped.isBlank()) return Collections.emptyList();
        return Arrays.stream(stripped.split(","))
                .map(s -> s.trim().replaceAll("^\"|\"$", ""))
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());
    }

    private UserDTO mapUserToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setName(user.getName() != null ? user.getName() : user.getUsername());
        dto.setRole(user.getRoleName());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setIsActive(user.getIsActive());
        dto.setPersonalEmail(user.getPersonalEmail());
        dto.setIsBoardChair(user.isBoardChair());
        dto.setSkills(parseSkills(user.getSkills()));
        return dto;
    }
}