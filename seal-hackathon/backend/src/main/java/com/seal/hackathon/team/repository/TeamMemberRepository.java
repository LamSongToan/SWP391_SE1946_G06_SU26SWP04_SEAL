package com.seal.hackathon.team.repository;

import com.seal.hackathon.team.entity.TeamMemberEntity;
import com.seal.hackathon.team.entity.TeamMemberId;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamMemberRepository extends JpaRepository<TeamMemberEntity, TeamMemberId> {

    @EntityGraph(attributePaths = {"student", "student.userRole", "student.userRole.user"})
    List<TeamMemberEntity> findByTeamTeamIdOrderByJoinedAtAsc(Integer teamId);

    long countByTeamTeamId(Integer teamId);

    @Query("""
            SELECT CASE WHEN COUNT(tm) > 0 THEN true ELSE false END
            FROM TeamMemberEntity tm
            WHERE tm.student.userRoleId = :userRoleId
              AND tm.team.track.eventId = :eventId
            """)
    boolean existsMembershipInEvent(@Param("userRoleId") Integer userRoleId,
                                    @Param("eventId") Integer eventId);

    @Query("""
            SELECT DISTINCT tm.student.userRole.user.userId
            FROM TeamMemberEntity tm
            WHERE tm.team.track.eventId = :eventId
            """)
    List<Integer> findDistinctStudentUserIdsByEventId(@Param("eventId") Integer eventId);

    boolean existsByTeamTeamIdAndStudentUserRoleId(Integer teamId, Integer userRoleId);

    void deleteByTeamTeamId(Integer teamId);
}
