package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.AuditLogEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Integer> {

    @EntityGraph(attributePaths = {"user"})
    List<AuditLogEntity> findTop300ByOrderByTimestampDesc();

    Optional<AuditLogEntity> findTopByActionTypeAndTargetEntityAndTargetIdOrderByTimestampDesc(
            String actionType,
            String targetEntity,
            Integer targetId
    );

    List<AuditLogEntity> findByActionTypeAndTargetEntityAndTargetIdInOrderByTimestampDesc(
            String actionType,
            String targetEntity,
            Collection<Integer> targetIds
    );
}
