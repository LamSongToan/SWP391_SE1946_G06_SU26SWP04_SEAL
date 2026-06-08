package com.seal.hackathon.auth.repository;

import com.seal.hackathon.auth.entity.MentorProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MentorProfileRepository extends JpaRepository<MentorProfileEntity, Integer> {
    Optional<MentorProfileEntity> findByUserRoleUserUserId(Integer userId);
}