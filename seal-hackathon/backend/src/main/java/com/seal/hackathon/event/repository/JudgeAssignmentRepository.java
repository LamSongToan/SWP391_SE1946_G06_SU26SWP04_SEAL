package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.JudgeAssignmentEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
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
}