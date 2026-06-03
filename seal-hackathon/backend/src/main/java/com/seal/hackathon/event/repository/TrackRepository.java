package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.TrackEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrackRepository extends JpaRepository<TrackEntity, Integer> {

    List<TrackEntity> findByEventIdOrderByTrackIdAsc(Integer eventId);

    boolean existsByEventIdAndNameIgnoreCase(Integer eventId, String name);

    long countByEventId(Integer eventId);
}
