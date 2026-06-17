package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.JudgeAssignmentEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface JudgeAssignmentRepository extends JpaRepository<JudgeAssignmentEntity, Integer> {

    @EntityGraph(attributePaths = {
        "judge", "judge.userRole", "judge.userRole.user",
        "round", "track"
    })
    List<JudgeAssignmentEntity> findByRoundRoundId(Integer roundId);

    @EntityGraph(attributePaths = {
        "judge", "judge.userRole", "judge.userRole.user",
        "round", "track"
    })
    List<JudgeAssignmentEntity> findByJudgeUserRoleId(Integer judgeUserRoleId);

    @EntityGraph(attributePaths = {
        "judge", "judge.userRole", "judge.userRole.user",
        "round", "track"
    })
    List<JudgeAssignmentEntity> findByRoundRoundIdAndTrackTrackId(Integer roundId, Integer trackId);

    Optional<JudgeAssignmentEntity> findByRoundRoundIdAndTrackTrackIdAndJudgeUserRoleId(
            Integer roundId, Integer trackId, Integer judgeUserRoleId);

    boolean existsByRoundRoundIdAndTrackTrackIdAndJudgeUserRoleId(
            Integer roundId, Integer trackId, Integer judgeUserRoleId);

    boolean existsByJudgeAssignmentIdAndJudgeUserRoleId(Integer judgeAssignmentId, Integer judgeUserRoleId);

    @Query("""
            SELECT DISTINCT ja.judge.userRole.user.userId
            FROM JudgeAssignmentEntity ja
            WHERE ja.round.eventId = :eventId
            """)
    List<Integer> findDistinctJudgeUserIdsByEventId(@Param("eventId") Integer eventId);
}
