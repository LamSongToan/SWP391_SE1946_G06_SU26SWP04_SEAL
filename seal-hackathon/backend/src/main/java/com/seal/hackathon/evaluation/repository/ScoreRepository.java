package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.dto.ResearchDatasetRowProjection;
import com.seal.hackathon.evaluation.entity.ScoreEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("""
            SELECT
                event.eventId AS eventId,
                event.semester AS eventSemester,
                event.year AS eventYear,
                round.roundId AS roundId,
                round.roundOrder AS roundOrder,
                round.roundName AS roundName,
                track.trackId AS trackId,
                track.name AS trackName,
                team.teamId AS teamId,
                submission.submissionId AS submissionId,
                submission.status AS submissionStatus,
                submission.calibration AS calibration,
                assignment.judgeAssignmentId AS judgeAssignmentId,
                criteria.criteriaId AS criteriaId,
                criteria.criteriaName AS criteriaName,
                criteria.criteriaType AS criteriaType,
                criteria.weight AS criteriaWeight,
                score.scoreValue AS scoreValue,
                submission.submittedAt AS submittedAt,
                score.scoredAt AS scoredAt
            FROM EvaluationScoreEntity score
            JOIN score.submission submission
            JOIN submission.round round
            JOIN HackathonEventEntity event ON event.eventId = round.eventId
            JOIN submission.team team
            LEFT JOIN team.track track
            JOIN score.judgeAssignment assignment
            JOIN score.criteria criteria
            WHERE round.roundId = :roundId
              AND (:trackId IS NULL OR track.trackId = :trackId)
              AND (:includeCalibration = true OR submission.calibration = false)
            ORDER BY track.trackId ASC, submission.submissionId ASC, assignment.judgeAssignmentId ASC, criteria.criteriaId ASC
            """)
    List<ResearchDatasetRowProjection> findResearchDatasetRows(@Param("roundId") Integer roundId,
                                                               @Param("trackId") Integer trackId,
                                                               @Param("includeCalibration") boolean includeCalibration);

    boolean existsBySubmissionSubmissionId(Integer submissionId);

    boolean existsBySubmissionRoundRoundId(Integer roundId);
}
