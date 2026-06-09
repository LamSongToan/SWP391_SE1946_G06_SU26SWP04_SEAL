package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.JudgeAssignmentEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository("evaluationJudgeAssignmentRepository")
public interface JudgeAssignmentRepository extends JpaRepository<JudgeAssignmentEntity, Integer> {

    @EntityGraph(attributePaths = {"round", "track", "judgeRole", "judgeRole.user"})
    List<JudgeAssignmentEntity> findByJudgeRoleUserRoleIdOrderByRoundRoundOrderAscTrackNameAsc(Integer judgeRoleId);

    @EntityGraph(attributePaths = {"round", "track", "judgeRole", "judgeRole.user"})
    Optional<JudgeAssignmentEntity> findByRoundRoundIdAndTrackTrackIdAndJudgeRoleUserRoleId(
            Integer roundId,
            Integer trackId,
            Integer judgeRoleId
    );

    @EntityGraph(attributePaths = {"round", "track", "judgeRole", "judgeRole.user"})
    @Query("""
            SELECT ja
            FROM EvaluationJudgeAssignmentEntity ja
            WHERE ja.round.roundId = :roundId
            ORDER BY ja.track.name ASC, ja.judgeRole.user.fullName ASC
            """)
    List<JudgeAssignmentEntity> findByRoundRoundIdOrderByTrackAndJudge(Integer roundId);
}
