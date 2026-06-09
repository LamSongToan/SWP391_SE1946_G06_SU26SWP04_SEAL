package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.AuditLogEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Integer> {

    @EntityGraph(attributePaths = {"user"})
    List<AuditLogEntity> findTop300ByOrderByTimestampDesc();
}
