package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.EditorialActionTypeLookup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface EditorialActionTypeLookupRepository extends JpaRepository<EditorialActionTypeLookup, String> {
    Optional<EditorialActionTypeLookup> findByName(String name);
}
