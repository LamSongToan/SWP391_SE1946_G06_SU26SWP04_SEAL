package com.seal.hackathon.submission.entity;

import com.seal.hackathon.event.entity.JudgeAssignmentEntity;
import com.seal.hackathon.event.entity.ScoringCriteriaEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter
@Entity
@Table(name = "Score")
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

    @Column(name = "score_value", nullable = false)
    private BigDecimal scoreValue;

    @Column(name = "comment")
    private String comment;

    @Column(name = "scored_at", nullable = false)
    private LocalDateTime scoredAt;

    @PrePersist
    public void prePersist() {
        if (scoredAt == null) scoredAt = LocalDateTime.now();
    }
}