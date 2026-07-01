package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.CalibrationScoreEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CalibrationScoreRepository extends JpaRepository<CalibrationScoreEntity, Integer> {
    List<CalibrationScoreEntity> findBySessionSessionIdOrderByScoredAtDesc(Integer sessionId);
}
