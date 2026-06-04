package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, String> {

    Page<Task> findByAssignedTo(String assignedTo, Pageable pageable);

    Page<Task> findByAssignedToAndStatus(String assignedTo, Task.TaskStatus status, Pageable pageable);

    List<Task> findByAssignedTo(String assignedTo);

    List<Task> findByPageId(String pageId);

    List<Task> findByAssignedByAndStatus(String assignedBy, Task.TaskStatus status);

    List<Task> findByAssignedBy(String assignedBy);

    // Lấy tất cả task approved của assistant (dùng cho earnings)
    @Query("SELECT t FROM Task t WHERE t.assignedTo = :assistantId AND t.status = 'approved'")
    List<Task> findApprovedByAssistant(@Param("assistantId") String assistantId);
// Thêm method này vào TaskRepository.java hiện có:

    // Lấy tasks theo chapterId (join qua pages table)
    @Query(value = "SELECT t.* FROM panel_tasks t " +
            "JOIN pages p ON t.page_id = p.id " +
            "WHERE p.chapter_id = :chapterId", nativeQuery = true)
    List<Task> findByChapterId(@Param("chapterId") String chapterId);
}