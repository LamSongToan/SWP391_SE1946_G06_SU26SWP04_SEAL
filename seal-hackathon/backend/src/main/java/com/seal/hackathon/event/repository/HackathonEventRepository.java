package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.HackathonEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface HackathonEventRepository extends JpaRepository<HackathonEventEntity, Integer> {

    List<HackathonEventEntity> findAllByOrderByEventIdDesc();

    List<HackathonEventEntity> findAllByOrderByStartDateDescEventIdDesc();

    boolean existsByYearAndSemesterIgnoreCase(Integer year, String semester);

    boolean existsByYearAndSemesterIgnoreCaseAndEventIdNot(Integer year, String semester, Integer eventId);

    @Query("""
            SELECT e
            FROM HackathonEventEntity e
            WHERE e.endDate >= :today
              AND upper(e.status) IN ('ONGOING', 'ACTIVE', 'REGISTRATIONOPEN', 'SCORING', 'RESULTPUBLISHED')
            ORDER BY e.startDate ASC, e.eventId ASC
            """)
    List<HackathonEventEntity> findUpcomingEvents(@Param("today") LocalDate today);
}
