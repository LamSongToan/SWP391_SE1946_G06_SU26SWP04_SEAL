package com.seal.hackathon.auth.repository;

import com.seal.hackathon.auth.entity.StudentProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StudentProfileRepository extends JpaRepository<StudentProfileEntity, Integer> {
    Optional<StudentProfileEntity> findByUserRoleUserUserId(Integer userId);
}
