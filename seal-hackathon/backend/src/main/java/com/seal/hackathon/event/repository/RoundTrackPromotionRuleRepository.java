package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.RoundTrackPromotionRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface RoundTrackPromotionRuleRepository extends JpaRepository<RoundTrackPromotionRuleEntity, Integer> {

    List<RoundTrackPromotionRuleEntity> findByRoundIdOrderByTrackIdAsc(Integer roundId);

    List<RoundTrackPromotionRuleEntity> findByTrackIdInOrderByRoundIdAscTrackIdAsc(Collection<Integer> trackIds);

    void deleteByRoundId(Integer roundId);

    void deleteByTrackId(Integer trackId);
}
