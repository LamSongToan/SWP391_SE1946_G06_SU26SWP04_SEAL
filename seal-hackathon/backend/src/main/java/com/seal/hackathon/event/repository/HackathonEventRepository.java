package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.HackathonEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface HackathonEventRepository extends JpaRepository<HackathonEventEntity, Integer> {

    List<HackathonEventEntity> findAllByOrderByStartDateDescEventIdDesc();

    boolean existsByYearAndSeasonIgnoreCase(Integer year, String season);

    boolean existsByYearAndSeasonIgnoreCaseAndEventIdNot(Integer year, String season, Integer eventId);

    @Query("""
            SELECT e
            FROM HackathonEventEntity e
            WHERE e.endDate >= :today
              AND upper(e.status) IN ('REGISTRATIONOPEN', 'ONGOING', 'SCORING', 'UPCOMING', 'ACTIVE')
            ORDER BY e.startDate ASC, e.eventId ASC
            """)
    List<HackathonEventEntity> findUpcomingEvents(@Param("today") LocalDate today);
}
