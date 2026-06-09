package com.seal.hackathon.submission.repository;

import com.seal.hackathon.submission.entity.SubmissionEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<SubmissionEntity, Integer> {

    @EntityGraph(attributePaths = {
            "team", "team.track", "team.leader", "team.leader.userRole", "team.leader.userRole.user",
            "round", "submittedBy", "submittedBy.userRole", "submittedBy.userRole.user"
    })
    List<SubmissionEntity> findByTeamTeamIdOrderByRoundRoundOrderAscSubmittedAtDesc(Integer teamId);

    @EntityGraph(attributePaths = {
            "team", "team.track", "team.leader", "team.leader.userRole", "team.leader.userRole.user",
            "round", "submittedBy", "submittedBy.userRole", "submittedBy.userRole.user"
    })
    Optional<SubmissionEntity> findByTeamTeamIdAndRoundRoundId(Integer teamId, Integer roundId);

    @EntityGraph(attributePaths = {
            "team", "team.track", "team.leader", "team.leader.userRole", "team.leader.userRole.user",
            "round", "submittedBy", "submittedBy.userRole", "submittedBy.userRole.user"
    })
    Optional<SubmissionEntity> findTopByTeamTeamIdOrderBySubmittedAtDesc(Integer teamId);

    @EntityGraph(attributePaths = {
            "team", "team.track", "team.leader", "team.leader.userRole", "team.leader.userRole.user",
            "round", "submittedBy", "submittedBy.userRole", "submittedBy.userRole.user"
    })
    @Query("SELECT s FROM SubmissionEntity s WHERE s.submissionId = :submissionId")
    Optional<SubmissionEntity> findDetailedById(@Param("submissionId") Integer submissionId);

    @EntityGraph(attributePaths = {
            "team", "team.track", "team.leader", "team.leader.userRole", "team.leader.userRole.user",
            "round", "submittedBy", "submittedBy.userRole", "submittedBy.userRole.user"
    })
    @Query("""
            SELECT s
            FROM SubmissionEntity s
            WHERE s.team.track.eventId = :eventId
            ORDER BY s.round.roundOrder ASC, s.submittedAt DESC
            """)
    List<SubmissionEntity> findByEventId(@Param("eventId") Integer eventId);

    @EntityGraph(attributePaths = {
            "team", "team.track", "team.leader", "team.leader.userRole", "team.leader.userRole.user",
            "round", "submittedBy", "submittedBy.userRole", "submittedBy.userRole.user"
    })
    List<SubmissionEntity> findByRoundRoundIdOrderByTeamTeamNameAsc(Integer roundId);

    @EntityGraph(attributePaths = {
            "team", "team.track", "team.leader", "team.leader.userRole", "team.leader.userRole.user",
            "round", "submittedBy", "submittedBy.userRole", "submittedBy.userRole.user"
    })
    @Query("""
            SELECT s
            FROM SubmissionEntity s
            WHERE EXISTS (
                SELECT 1
                FROM JudgeAssignmentEntity ja
                WHERE ja.round.roundId = s.round.roundId
                  AND ja.track.trackId = s.team.track.trackId
                  AND ja.judge.userRoleId = :judgeRoleId
            )
            ORDER BY s.round.roundOrder ASC, s.submittedAt DESC
            """)
    List<SubmissionEntity> findAssignedToJudge(@Param("judgeRoleId") Integer judgeRoleId);

    @EntityGraph(attributePaths = {
            "team", "team.track", "team.leader", "team.leader.userRole", "team.leader.userRole.user",
            "round", "submittedBy", "submittedBy.userRole", "submittedBy.userRole.user"
    })
    @Query("""
            SELECT s
            FROM SubmissionEntity s
            WHERE EXISTS (
                SELECT 1
                FROM TrackMentorEntity tm
                WHERE tm.track.trackId = s.team.track.trackId
                  AND tm.mentor.userRoleId = :mentorRoleId
            )
            ORDER BY s.team.teamName ASC, s.submittedAt DESC
            """)
    List<SubmissionEntity> findAssignedToMentor(@Param("mentorRoleId") Integer mentorRoleId);

    @Query(value = """
            SELECT CASE WHEN COUNT(*) > 0 THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END
            FROM Ranking
            WHERE team_id = :teamId
              AND round_id = :roundId
              AND qualified_next_round = 1
            """, nativeQuery = true)
    boolean existsQualifiedRanking(@Param("teamId") Integer teamId,
                                   @Param("roundId") Integer roundId);
}
