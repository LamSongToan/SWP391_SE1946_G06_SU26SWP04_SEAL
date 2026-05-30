package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.RoundEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoundRepository extends JpaRepository<RoundEntity, Integer> {
    List<RoundEntity> findByEventIdOrderByRoundOrderAsc(Integer eventId);
}
