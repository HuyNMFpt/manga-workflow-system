package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.PriorityLookup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PriorityLookupRepository extends JpaRepository<PriorityLookup, String> {
    Optional<PriorityLookup> findByName(String name);
}
