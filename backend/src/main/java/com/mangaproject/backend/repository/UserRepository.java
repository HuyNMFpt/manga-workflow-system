package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRole(User.UserRole role);
    List<User> findByRoleAndIsActiveTrue(User.UserRole role);
}