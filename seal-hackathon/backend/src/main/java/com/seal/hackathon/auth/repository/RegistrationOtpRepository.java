package com.seal.hackathon.auth.repository;

import com.seal.hackathon.auth.entity.RegistrationOtpEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RegistrationOtpRepository extends JpaRepository<RegistrationOtpEntity, Integer> {

    Optional<RegistrationOtpEntity> findTopByEmailIgnoreCaseAndUsedFalseOrderByCreatedAtDesc(String email);

    @Modifying
    @Query("UPDATE RegistrationOtpEntity r SET r.used = true WHERE LOWER(r.email) = LOWER(:email) AND r.used = false")
    void invalidateAllForEmail(@Param("email") String email);
}
