package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.TrackMentorEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TrackMentorRepository extends JpaRepository<TrackMentorEntity, Integer> {

    @EntityGraph(attributePaths = {
        "mentor", "mentor.userRole", "mentor.userRole.user",
        "track"
    })
    List<TrackMentorEntity> findByTrackTrackId(Integer trackId);

    @EntityGraph(attributePaths = {
        "mentor", "mentor.userRole", "mentor.userRole.user",
        "track"
    })
    List<TrackMentorEntity> findByMentorUserRoleId(Integer mentorUserRoleId);

    @EntityGraph(attributePaths = {
        "mentor", "mentor.userRole", "mentor.userRole.user",
        "track"
    })
    @Query("""
            SELECT tm
            FROM TrackMentorEntity tm
            WHERE tm.mentor.userRoleId = :mentorUserRoleId
              AND tm.track.eventId = :eventId
            """)
    List<TrackMentorEntity> findByMentorUserRoleIdAndTrackEventId(@Param("mentorUserRoleId") Integer mentorUserRoleId,
                                                                  @Param("eventId") Integer eventId);

    boolean existsByTrackTrackIdAndMentorUserRoleId(Integer trackId, Integer mentorUserRoleId);

    Optional<TrackMentorEntity> findByTrackTrackIdAndMentorUserRoleId(Integer trackId, Integer mentorUserRoleId);

    @Query("""
            SELECT DISTINCT tm.mentor.userRole.user.userId
            FROM TrackMentorEntity tm
            WHERE tm.track.eventId = :eventId
            """)
    List<Integer> findDistinctMentorUserIdsByEventId(@Param("eventId") Integer eventId);

    @EntityGraph(attributePaths = {
        "mentor", "mentor.userRole", "mentor.userRole.user",
        "track"
    })
    List<TrackMentorEntity> findByTrackEventId(Integer eventId);

    @EntityGraph(attributePaths = {
        "mentor", "mentor.userRole", "mentor.userRole.user",
        "track"
    })
    @Query("""
            SELECT tm
            FROM TrackMentorEntity tm
            WHERE tm.mentor.userRole.user.userId = :userId
              AND tm.track.eventId = :eventId
            """)
    List<TrackMentorEntity> findByMentorUserIdAndTrackEventId(@Param("userId") Integer userId,
                                                              @Param("eventId") Integer eventId);
}
