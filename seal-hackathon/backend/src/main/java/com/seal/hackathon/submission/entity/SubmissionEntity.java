package com.seal.hackathon.submission.entity;

import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.team.entity.TeamEntity;
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
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "Submission")
public class SubmissionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "submission_id")
    private Integer submissionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private TeamEntity team;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "round_id", nullable = false)
    private RoundEntity round;

    @Column(name = "repository_url", nullable = false, length = 1000)
    private String repositoryUrl;

    @Column(name = "demo_url", length = 1000)
    private String demoUrl;

    @Column(name = "slide_url", length = 1000)
    private String slideUrl;

    @Column(name = "github_metadata", columnDefinition = "NVARCHAR(MAX)")
    private String githubMetadata;

    @Column(name = "is_calibration", nullable = false)
    private Boolean calibration;

    @Column(name = "status", nullable = false, length = 50)
    private String status;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by_user_role_id")
    private StudentProfileEntity submittedBy;

    @PrePersist
    public void prePersist() {
        if (calibration == null) {
            calibration = Boolean.FALSE;
        }
        if (status == null) {
            status = SubmissionStatus.SUBMITTED.getDbValue();
        }
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = submittedAt;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
