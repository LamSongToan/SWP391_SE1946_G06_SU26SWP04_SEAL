package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.JudgeEvaluationEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JudgeEvaluationRepository extends JpaRepository<JudgeEvaluationEntity, Integer> {

    @EntityGraph(attributePaths = {"submission", "judgeAssignment"})
    Optional<JudgeEvaluationEntity> findBySubmissionSubmissionIdAndJudgeAssignmentJudgeAssignmentId(
            Integer submissionId,
            Integer judgeAssignmentId
    );

    List<JudgeEvaluationEntity> findByJudgeAssignmentJudgeRoleUserRoleId(Integer judgeRoleId);

    @EntityGraph(attributePaths = {"submission", "submission.team", "submission.team.track", "judgeAssignment", "judgeAssignment.judgeRole", "judgeAssignment.judgeRole.user"})
    List<JudgeEvaluationEntity> findBySubmissionRoundRoundId(Integer roundId);

    boolean existsBySubmissionRoundRoundId(Integer roundId);
}
