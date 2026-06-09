package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.JudgeAssignmentEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JudgeAssignmentRepository extends JpaRepository<JudgeAssignmentEntity, Integer> {

    @EntityGraph(attributePaths = {"round", "track", "judgeRole", "judgeRole.user"})
    List<JudgeAssignmentEntity> findByJudgeRoleUserRoleIdOrderByRoundRoundOrderAscTrackNameAsc(Integer judgeRoleId);

    @EntityGraph(attributePaths = {"round", "track", "judgeRole", "judgeRole.user"})
    Optional<JudgeAssignmentEntity> findByRoundRoundIdAndTrackTrackIdAndJudgeRoleUserRoleId(
            Integer roundId,
            Integer trackId,
            Integer judgeRoleId
    );
}
