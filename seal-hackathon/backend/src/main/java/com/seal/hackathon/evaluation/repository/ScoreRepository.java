package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.ScoreEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository("evaluationScoreRepository")
public interface ScoreRepository extends JpaRepository<ScoreEntity, Integer> {

    @EntityGraph(attributePaths = {"criteria", "judgeAssignment", "judgeAssignment.judgeRole", "judgeAssignment.judgeRole.user"})
    List<ScoreEntity> findBySubmissionSubmissionIdAndJudgeAssignmentJudgeAssignmentIdOrderByCriteriaCriteriaIdAsc(
            Integer submissionId,
            Integer judgeAssignmentId
    );

    Optional<ScoreEntity> findBySubmissionSubmissionIdAndCriteriaCriteriaIdAndJudgeAssignmentJudgeAssignmentId(
            Integer submissionId,
            Integer criteriaId,
            Integer judgeAssignmentId
    );

    @EntityGraph(attributePaths = {"criteria", "submission", "judgeAssignment"})
    List<ScoreEntity> findByJudgeAssignmentJudgeRoleUserRoleIdAndSubmissionSubmissionIdIn(
            Integer judgeRoleId,
            Collection<Integer> submissionIds
    );

    long countByJudgeAssignmentJudgeRoleUserRoleId(Integer judgeRoleId);

    @EntityGraph(attributePaths = {
            "criteria",
            "submission",
            "submission.team",
            "submission.team.track",
            "judgeAssignment",
            "judgeAssignment.judgeRole",
            "judgeAssignment.judgeRole.user"
    })
    List<ScoreEntity> findBySubmissionRoundRoundId(Integer roundId);

    boolean existsBySubmissionRoundRoundId(Integer roundId);
}
