package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.RoundEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoundRepository extends JpaRepository<RoundEntity, Integer> {
    List<RoundEntity> findByEventIdOrderByRoundOrderAsc(Integer eventId);

    Optional<RoundEntity> findByEventIdAndRoundOrder(Integer eventId, Integer roundOrder);

    long countByEventId(Integer eventId);
}
