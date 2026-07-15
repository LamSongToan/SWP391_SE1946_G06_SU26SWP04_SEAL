package com.seal.hackathon.event.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(
        name = "RoundTrackPromotionRule",
        uniqueConstraints = @UniqueConstraint(
                name = "UQ_RoundTrackPromotionRule_Round_Track",
                columnNames = {"round_id", "track_id"}
        )
)
public class RoundTrackPromotionRuleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "promotion_rule_id")
    private Integer promotionRuleId;

    @Column(name = "round_id", nullable = false)
    private Integer roundId;

    @Column(name = "track_id", nullable = false)
    private Integer trackId;

    @Column(name = "top_n", nullable = false)
    private Integer topN;
}
