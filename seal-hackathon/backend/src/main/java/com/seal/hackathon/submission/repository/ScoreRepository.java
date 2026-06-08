package com.seal.hackathon.submission.repository;

import com.seal.hackathon.submission.entity.ScoreEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ScoreRepository extends JpaRepository<ScoreEntity, Integer> {

    @EntityGraph(attributePaths = {
        "criteria",
        "judgeAssignment", "judgeAssignment.judge",
        "judgeAssignment.judge.userRole", "judgeAssignment.judge.userRole.user",
        "submission", "submission.team", "submission.round"
    })
    List<ScoreEntity> findBySubmissionSubmissionId(Integer submissionId);

    @EntityGraph(attributePaths = {
        "criteria",
        "judgeAssignment", "judgeAssignment.judge",
        "judgeAssignment.judge.userRole", "judgeAssignment.judge.userRole.user",
        "submission", "submission.team", "submission.round"
    })
    List<ScoreEntity> findByJudgeAssignmentJudgeUserRoleId(Integer judgeUserRoleId);

    Optional<ScoreEntity> findBySubmissionSubmissionIdAndCriteriaCriteriaIdAndJudgeAssignmentJudgeAssignmentId(
            Integer submissionId, Integer criteriaId, Integer judgeAssignmentId);

    @Query("""
        SELECT AVG(CAST(s.scoreValue AS double))
        FROM ScoreEntity s
        WHERE s.submission.submissionId = :submissionId
    """)
    Optional<Double> findAverageScoreBySubmissionId(@Param("submissionId") Integer submissionId);

    boolean existsBySubmissionSubmissionIdAndJudgeAssignmentJudgeAssignmentId(
            Integer submissionId, Integer judgeAssignmentId);
}