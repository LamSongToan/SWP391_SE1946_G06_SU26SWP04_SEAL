package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.PrizeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrizeRepository extends JpaRepository<PrizeEntity, Integer> {

    List<PrizeEntity> findByEventEventIdOrderByPrizeIdAsc(Integer eventId);

    void deleteByEventEventId(Integer eventId);
}
