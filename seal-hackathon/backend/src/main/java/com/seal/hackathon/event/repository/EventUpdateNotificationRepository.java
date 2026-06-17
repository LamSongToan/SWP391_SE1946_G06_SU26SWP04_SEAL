package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.EventUpdateNotificationEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventUpdateNotificationRepository extends JpaRepository<EventUpdateNotificationEntity, Integer> {

    @EntityGraph(attributePaths = {"user"})
    List<EventUpdateNotificationEntity> findTop10ByUserUserIdOrderByCreatedAtDesc(Integer userId);
}
