package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.NotificationTypeLookup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface NotificationTypeLookupRepository extends JpaRepository<NotificationTypeLookup, String> {
    Optional<NotificationTypeLookup> findByName(String name);
}
