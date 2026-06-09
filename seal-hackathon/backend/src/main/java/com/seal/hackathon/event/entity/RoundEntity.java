package com.seal.hackathon.event.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "Round")
public class RoundEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "round_id")
    private Integer roundId;

    @Column(name = "event_id", nullable = false)
    private Integer eventId;

    @Column(name = "round_name", nullable = false)
    private String roundName;

    @Column(name = "round_order", nullable = false)
    private Integer roundOrder;

    @Column(name = "submission_deadline", nullable = false)
    private LocalDateTime submissionDeadline;

    @Column(name = "promotion_rule_top_n", nullable = false)
    private Integer promotionRuleTopN;

    @Column(name = "score_locked", nullable = false)
    private Boolean scoreLocked = false;
}
