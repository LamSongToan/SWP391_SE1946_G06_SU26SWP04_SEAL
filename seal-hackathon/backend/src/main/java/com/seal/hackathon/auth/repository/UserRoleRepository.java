package com.seal.hackathon.auth.repository;

import com.seal.hackathon.auth.entity.UserRoleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRoleRepository extends JpaRepository<UserRoleEntity, Integer> {
    Optional<UserRoleEntity> findByUserUserIdAndRoleTypeIgnoreCase(Integer userId, String roleType);

    @Query("""
            SELECT DISTINCT ur.user.userId
            FROM UserRoleEntity ur
            WHERE UPPER(ur.roleType) = UPPER(:roleType)
              AND UPPER(ur.user.status) IN ('ACTIVE', 'APPROVED')
            """)
    List<Integer> findDistinctActiveUserIdsByRoleType(@Param("roleType") String roleType);
}
