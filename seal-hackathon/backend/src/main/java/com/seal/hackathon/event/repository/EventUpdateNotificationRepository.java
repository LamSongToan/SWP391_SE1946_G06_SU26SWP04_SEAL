package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.EventUpdateNotificationEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface EventUpdateNotificationRepository extends JpaRepository<EventUpdateNotificationEntity, Integer> {

    @EntityGraph(attributePaths = {"user"})
    List<EventUpdateNotificationEntity> findTop10ByUserUserIdOrderByCreatedAtDesc(Integer userId);

    @EntityGraph(attributePaths = {"user"})
    List<EventUpdateNotificationEntity> findTop300ByOrderByCreatedAtDesc();

    @Query("""
            select n
            from EventUpdateNotificationEntity n
            where n.eventId = :eventId
              and n.createdAt = :createdAt
              and n.title = :title
              and n.message = :message
              and (
                    upper(n.announcementAudience) = upper(:audience)
                    or upper(n.announcementAudience) = 'COORDINATOR_COPY'
                  )
            """)
    List<EventUpdateNotificationEntity> findAnnouncementGroup(@Param("eventId") Integer eventId,
                                                              @Param("createdAt") LocalDateTime createdAt,
                                                              @Param("title") String title,
                                                              @Param("message") String message,
                                                              @Param("audience") String audience);
}
