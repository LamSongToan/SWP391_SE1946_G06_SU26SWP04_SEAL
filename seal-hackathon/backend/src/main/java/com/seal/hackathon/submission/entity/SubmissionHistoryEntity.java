package com.seal.hackathon.submission.entity;

import com.seal.hackathon.auth.entity.StudentProfileEntity;
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

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "SubmissionHistory")
public class SubmissionHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Integer historyId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private SubmissionEntity submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_user_role_id")
    private StudentProfileEntity changedBy;

    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType;

    @Column(name = "old_repository_url", length = 1000)
    private String oldRepositoryUrl;

    @Column(name = "new_repository_url", length = 1000)
    private String newRepositoryUrl;

    @Column(name = "old_demo_url", length = 1000)
    private String oldDemoUrl;

    @Column(name = "new_demo_url", length = 1000)
    private String newDemoUrl;

    @Column(name = "old_slide_url", length = 1000)
    private String oldSlideUrl;

    @Column(name = "new_slide_url", length = 1000)
    private String newSlideUrl;

    @Column(name = "old_status", length = 50)
    private String oldStatus;

    @Column(name = "new_status", length = 50)
    private String newStatus;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
