package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.ScoringCriteriaEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository("evaluationScoringCriteriaRepository")
public interface ScoringCriteriaRepository extends JpaRepository<ScoringCriteriaEntity, Integer> {
    @EntityGraph(attributePaths = {"round"})
    List<ScoringCriteriaEntity> findByRoundRoundIdOrderByCriteriaIdAsc(Integer roundId);

    @EntityGraph(attributePaths = {"round"})
    List<ScoringCriteriaEntity> findByRoundRoundIdIn(Collection<Integer> roundIds);

    boolean existsByRoundRoundId(Integer roundId);

    void deleteByRoundRoundId(Integer roundId);
}
