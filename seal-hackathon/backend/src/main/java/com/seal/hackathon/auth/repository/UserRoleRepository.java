package com.seal.hackathon.auth.repository;

import com.seal.hackathon.auth.entity.UserRoleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRoleRepository extends JpaRepository<UserRoleEntity, Integer> {
    Optional<UserRoleEntity> findByUserUserIdAndRoleTypeIgnoreCase(Integer userId, String roleType);
}
