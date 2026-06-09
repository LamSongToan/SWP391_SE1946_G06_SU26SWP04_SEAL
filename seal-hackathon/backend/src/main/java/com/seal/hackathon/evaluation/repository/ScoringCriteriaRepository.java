package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.ScoringCriteriaEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ScoringCriteriaRepository extends JpaRepository<ScoringCriteriaEntity, Integer> {
    List<ScoringCriteriaEntity> findByRoundRoundIdOrderByCriteriaIdAsc(Integer roundId);

    @EntityGraph(attributePaths = {"round"})
    List<ScoringCriteriaEntity> findByRoundRoundIdIn(Collection<Integer> roundIds);
}
