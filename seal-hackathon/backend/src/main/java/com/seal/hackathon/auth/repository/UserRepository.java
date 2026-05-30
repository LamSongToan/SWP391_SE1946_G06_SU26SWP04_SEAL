package com.seal.hackathon.auth.repository;

import com.seal.hackathon.auth.entity.UserEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Integer> {

    boolean existsByEmailIgnoreCase(String email);
    boolean existsByUsernameIgnoreCase(String username);

    @EntityGraph(attributePaths = "userRoles")
    Optional<UserEntity> findByEmailIgnoreCase(String email);

    @EntityGraph(attributePaths = "userRoles")
    Optional<UserEntity> findByUsernameIgnoreCase(String username);
}
