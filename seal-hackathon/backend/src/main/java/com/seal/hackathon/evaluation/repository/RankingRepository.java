package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.RankingEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RankingRepository extends JpaRepository<RankingEntity, Integer> {

    @EntityGraph(attributePaths = {"team", "team.track", "round"})
    List<RankingEntity> findByRoundRoundIdOrderByRankPositionAsc(Integer roundId);

    boolean existsByRoundRoundId(Integer roundId);

    void deleteByRoundRoundId(Integer roundId);
}
