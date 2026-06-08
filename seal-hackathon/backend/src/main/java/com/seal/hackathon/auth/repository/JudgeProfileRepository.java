package com.seal.hackathon.auth.repository;

import com.seal.hackathon.auth.entity.JudgeProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface JudgeProfileRepository extends JpaRepository<JudgeProfileEntity, Integer> {
    Optional<JudgeProfileEntity> findByUserRoleUserUserId(Integer userId);
}