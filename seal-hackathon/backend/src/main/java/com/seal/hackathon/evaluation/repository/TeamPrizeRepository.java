package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.TeamPrizeEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamPrizeRepository extends JpaRepository<TeamPrizeEntity, Integer> {

    @EntityGraph(attributePaths = {"team", "team.track", "prize", "prize.event"})
    List<TeamPrizeEntity> findByPrizeEventEventIdOrderByAwardedAtAscPrizePrizeIdAscTeamTeamNameAsc(Integer eventId);

    @Query("""
            select tp
            from TeamPrizeEntity tp
            join fetch tp.team team
            left join fetch team.track track
            join fetch tp.prize prize
            join fetch prize.event event
            where event.eventId = :eventId
            order by tp.awardedAt asc, prize.prizeId asc, team.teamName asc
            """)
    List<TeamPrizeEntity> findDetailedByEventId(@Param("eventId") Integer eventId);

    long countByPrizeEventEventId(Integer eventId);

    void deleteByPrizeEventEventId(Integer eventId);
}
