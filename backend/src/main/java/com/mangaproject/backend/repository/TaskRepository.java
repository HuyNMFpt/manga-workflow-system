package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, String> {
    Page<Task> findByAssignedTo(String assignedTo, Pageable pageable);
    Page<Task> findByAssignedToAndStatus(String assignedTo, Task.TaskStatus status, Pageable pageable);
    List<Task> findByPageId(String pageId);
    // Mới thêm: lấy task do mangaka giao, theo status
    List<Task> findByAssignedByAndStatus(String assignedBy, Task.TaskStatus status);
    List<Task> findByAssignedBy(String assignedBy);
}