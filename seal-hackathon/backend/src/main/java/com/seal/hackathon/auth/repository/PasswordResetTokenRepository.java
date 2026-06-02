package com.seal.hackathon.auth.repository;

import com.seal.hackathon.auth.entity.PasswordResetTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Integer> {

    Optional<PasswordResetTokenEntity> findByToken(String token);

    Optional<PasswordResetTokenEntity> findTopByUserUserIdAndUsedFalseOrderByCreatedAtDesc(Integer userId);

    @Modifying
    @Query("UPDATE PasswordResetTokenEntity p SET p.used = true WHERE p.user.userId = :userId AND p.used = false")
    void invalidateAllForUser(@Param("userId") Integer userId);
}
