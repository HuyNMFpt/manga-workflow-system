package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.PublishScheduleLookup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PublishScheduleLookupRepository extends JpaRepository<PublishScheduleLookup, String> {
    Optional<PublishScheduleLookup> findByName(String name);
}
