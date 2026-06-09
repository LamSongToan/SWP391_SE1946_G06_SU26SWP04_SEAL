package com.seal.hackathon.evaluation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "ScoreHistory")
public class ScoreHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "score_history_id")
    private Integer scoreHistoryId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private JudgeEvaluationEntity evaluation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criteria_id", nullable = false)
    private ScoringCriteriaEntity criteria;

    @Column(name = "old_score_value", precision = 5, scale = 2)
    private BigDecimal oldScoreValue;

    @Column(name = "new_score_value", nullable = false, precision = 5, scale = 2)
    private BigDecimal newScoreValue;

    @Column(name = "old_comment", columnDefinition = "NVARCHAR(MAX)")
    private String oldComment;

    @Column(name = "new_comment", columnDefinition = "NVARCHAR(MAX)")
    private String newComment;

    @Column(name = "action_type", nullable = false, length = 30)
    private String actionType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
