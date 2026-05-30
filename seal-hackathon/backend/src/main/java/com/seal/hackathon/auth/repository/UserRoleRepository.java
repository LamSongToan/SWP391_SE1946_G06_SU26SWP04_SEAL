package com.seal.hackathon.auth.repository;

import com.seal.hackathon.auth.entity.UserRoleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRoleRepository extends JpaRepository<UserRoleEntity, Integer> {
}
