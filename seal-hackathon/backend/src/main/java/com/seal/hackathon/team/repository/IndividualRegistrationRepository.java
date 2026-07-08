package com.seal.hackathon.team.repository;

import com.seal.hackathon.team.entity.IndividualRegistrationEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface IndividualRegistrationRepository extends JpaRepository<IndividualRegistrationEntity, Integer> {

    boolean existsByEventEventIdAndStudentUserRoleIdAndStatusIgnoreCase(Integer eventId, Integer userRoleId, String status);

    @EntityGraph(attributePaths = {"event", "student", "student.userRole", "student.userRole.user", "preferredTrack", "assignedTeam", "assignedTeam.track"})
    Optional<IndividualRegistrationEntity> findByEventEventIdAndStudentUserRoleId(Integer eventId, Integer userRoleId);

    @EntityGraph(attributePaths = {"event", "student", "student.userRole", "student.userRole.user", "preferredTrack", "assignedTeam", "assignedTeam.track"})
    List<IndividualRegistrationEntity> findByStudentUserRoleIdOrderByCreatedAtDesc(Integer userRoleId);

    @EntityGraph(attributePaths = {"event", "student", "student.userRole", "student.userRole.user", "preferredTrack"})
    List<IndividualRegistrationEntity> findByEventEventIdAndStatusIgnoreCaseOrderByCreatedAtAsc(Integer eventId, String status);

    @Query("""
            SELECT COUNT(reg)
            FROM IndividualRegistrationEntity reg
            WHERE reg.event.eventId = :eventId
              AND LOWER(reg.status) = LOWER(:status)
            """)
    long countByEventIdAndStatus(@Param("eventId") Integer eventId, @Param("status") String status);
}
