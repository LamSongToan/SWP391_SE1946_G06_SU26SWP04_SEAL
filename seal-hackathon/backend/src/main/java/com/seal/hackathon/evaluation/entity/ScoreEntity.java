package com.seal.hackathon.evaluation.entity;

import com.seal.hackathon.submission.entity.SubmissionEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity(name = "EvaluationScoreEntity")
@Table(
        name = "Score",
        uniqueConstraints = @UniqueConstraint(
                name = "UQ_Score_Submission_Criteria_Judge",
                columnNames = {"submission_id", "criteria_id", "judge_assignment_id"}
        )
)
public class ScoreEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "score_id")
    private Integer scoreId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private SubmissionEntity submission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criteria_id", nullable = false)
    private ScoringCriteriaEntity criteria;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "judge_assignment_id", nullable = false)
    private JudgeAssignmentEntity judgeAssignment;

    @Column(name = "score_value", nullable = false, precision = 5, scale = 2)
    private BigDecimal scoreValue;

    @Column(name = "comment", columnDefinition = "NVARCHAR(MAX)")
    private String comment;

    @Column(name = "scored_at", nullable = false)
    private LocalDateTime scoredAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        scoredAt = LocalDateTime.now();
    }
}
