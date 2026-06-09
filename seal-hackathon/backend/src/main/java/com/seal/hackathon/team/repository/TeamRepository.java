package com.seal.hackathon.team.repository;

import com.seal.hackathon.team.entity.TeamEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeamRepository extends JpaRepository<TeamEntity, Integer> {

    @EntityGraph(attributePaths = {"track", "leader", "leader.userRole", "leader.userRole.user"})
    @Query("""
            SELECT DISTINCT t
            FROM TeamEntity t
            JOIN TeamMemberEntity tm ON tm.team = t
            WHERE tm.student.userRole.user.userId = :userId
            ORDER BY t.createdAt DESC
            """)
    List<TeamEntity> findTeamsForUser(@Param("userId") Integer userId);

    @EntityGraph(attributePaths = {"track", "leader", "leader.userRole", "leader.userRole.user"})
    @Query("SELECT t FROM TeamEntity t WHERE t.teamId = :teamId")
    Optional<TeamEntity> findDetailedById(@Param("teamId") Integer teamId);

    @Query("""
            SELECT CASE WHEN COUNT(t) > 0 THEN true ELSE false END
            FROM TeamEntity t
            WHERE t.track.eventId = :eventId
              AND LOWER(t.teamName) = LOWER(:teamName)
            """)
    boolean existsByEventIdAndTeamNameIgnoreCase(@Param("eventId") Integer eventId,
                                                 @Param("teamName") String teamName);

    Optional<TeamEntity> findByJoinCodeIgnoreCase(String joinCode);

    long countByTrackTrackId(Integer trackId);

    @Query("""
            SELECT COUNT(t)
            FROM TeamEntity t
            WHERE t.track.eventId = :eventId
            """)
    long countByEventId(@Param("eventId") Integer eventId);

    @Query("""
            SELECT COUNT(t)
            FROM TeamEntity t
            WHERE t.track.eventId = :eventId
              AND (
                    SELECT COUNT(tm)
                    FROM TeamMemberEntity tm
                    WHERE tm.team = t
                  ) NOT BETWEEN :minSize AND :maxSize
            """)
    long countInvalidTeamSizesByEventId(@Param("eventId") Integer eventId,
                                        @Param("minSize") int minSize,
                                        @Param("maxSize") int maxSize);

    @Query(value = "SELECT COUNT(*) FROM Submission WHERE team_id = :teamId", nativeQuery = true)
    long countSubmissionsByTeamId(@Param("teamId") Integer teamId);

    @EntityGraph(attributePaths = {"track", "leader", "leader.userRole", "leader.userRole.user"})
    @Query("""
            SELECT t
            FROM TeamEntity t
            WHERE EXISTS (
                SELECT 1
                FROM TrackMentorEntity tm
                WHERE tm.track.trackId = t.track.trackId
                  AND tm.mentor.userRoleId = :mentorRoleId
            )
            ORDER BY t.teamName ASC
            """)
    List<TeamEntity> findAssignedToMentor(@Param("mentorRoleId") Integer mentorRoleId);

    @Query("""
            SELECT CASE WHEN COUNT(t) > 0 THEN true ELSE false END
            FROM TeamEntity t
            WHERE t.teamId = :teamId
              AND EXISTS (
                  SELECT 1
                  FROM TrackMentorEntity tm
                  WHERE tm.track.trackId = t.track.trackId
                    AND tm.mentor.userRoleId = :mentorRoleId
              )
            """)
    boolean existsMentorAssignmentForTeam(@Param("mentorRoleId") Integer mentorRoleId,
                                          @Param("teamId") Integer teamId);

    @Query("""
            SELECT COUNT(tm)
            FROM TrackMentorEntity tm
            WHERE tm.mentor.userRoleId = :mentorRoleId
            """)
    long countAssignedTracksForMentor(@Param("mentorRoleId") Integer mentorRoleId);
}
