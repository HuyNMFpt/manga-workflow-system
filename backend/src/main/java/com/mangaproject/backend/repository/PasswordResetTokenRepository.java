package com.mangaproject.backend.repository;

import com.mangaproject.backend.model.PasswordResetToken;
import com.mangaproject.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, String> {

    /**
     * Find valid token (not expired, not used)
     */
    Optional<PasswordResetToken> findByToken(String token);

    /**
     * Find all tokens for a user
     */
    Optional<PasswordResetToken> findByUser(User user);

    /**
     * Count recent reset requests (for rate limiting)
     */
    @Query("SELECT COUNT(p) FROM PasswordResetToken p WHERE p.user = :user AND p.createdAt > :since")
    long countRecentRequestsByUser(User user, LocalDateTime since);

    /**
     * Delete all expired tokens (cleanup job)
     */
    @Modifying
    @Query("DELETE FROM PasswordResetToken p WHERE p.expiryDate < :now OR p.used = true")
    void deleteExpiredAndUsedTokens(LocalDateTime now);

    /**
     * Delete all tokens for a user (when password is reset)
     */
    @Modifying
    void deleteByUser(User user);
}