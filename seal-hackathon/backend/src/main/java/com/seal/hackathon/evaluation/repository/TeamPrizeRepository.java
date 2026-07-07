package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.TeamPrizeEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TeamPrizeRepository extends JpaRepository<TeamPrizeEntity, Integer> {

    @EntityGraph(attributePaths = {"team", "team.track", "prize", "prize.event"})
    List<TeamPrizeEntity> findByPrizeEventEventIdOrderByAwardedAtAscPrizePrizeIdAscTeamTeamNameAsc(Integer eventId);

    long countByPrizeEventEventId(Integer eventId);

    void deleteByPrizeEventEventId(Integer eventId);
}
