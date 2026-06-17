package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.ScoringCriteriaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ScoringCriteriaRepository extends JpaRepository<ScoringCriteriaEntity, Integer> {
    List<ScoringCriteriaEntity> findByRoundIdOrderByCriteriaId(Integer roundId);
    void deleteByRoundId(Integer roundId);
}
