package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.ScoreHistoryEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScoreHistoryRepository extends JpaRepository<ScoreHistoryEntity, Integer> {

    @EntityGraph(attributePaths = {"criteria"})
    List<ScoreHistoryEntity> findByEvaluationEvaluationIdOrderByCreatedAtDesc(Integer evaluationId);
}
