package com.seal.hackathon.event.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
@Entity
@Table(name = "ScoringCriteria")
public class ScoringCriteriaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "criteria_id")
    private Integer criteriaId;

    @Column(name = "round_id", nullable = false)
    private Integer roundId;

    @Column(name = "criteria_name", nullable = false, length = 150)
    private String criteriaName;

    @Column(name = "weight", nullable = false)
    private java.math.BigDecimal weight;

    @Column(name = "criteria_type", nullable = false, length = 50)
    private String criteriaType;
}