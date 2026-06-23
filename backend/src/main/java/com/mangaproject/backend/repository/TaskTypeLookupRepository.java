package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.TaskTypeLookup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface TaskTypeLookupRepository extends JpaRepository<TaskTypeLookup, String> {
    Optional<TaskTypeLookup> findByName(String name);
}
