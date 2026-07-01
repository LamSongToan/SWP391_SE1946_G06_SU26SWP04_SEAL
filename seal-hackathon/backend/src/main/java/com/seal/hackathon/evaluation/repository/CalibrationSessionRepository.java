package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.CalibrationSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CalibrationSessionRepository extends JpaRepository<CalibrationSessionEntity, Integer> {
    List<CalibrationSessionEntity> findByRoundRoundIdOrderByCreatedAtDesc(Integer roundId);
}
