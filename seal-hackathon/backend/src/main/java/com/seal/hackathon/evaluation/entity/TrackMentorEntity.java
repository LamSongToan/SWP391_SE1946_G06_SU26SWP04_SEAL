package com.seal.hackathon.evaluation.entity;

import com.seal.hackathon.auth.entity.UserRoleEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity(name = "EvaluationTrackMentorEntity")
@Table(name = "TrackMentor")
public class TrackMentorEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "track_mentor_id")
    private Integer trackMentorId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "track_id", nullable = false)
    private TrackEntity track;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_role_id", nullable = false)
    private UserRoleEntity mentorRole;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;
}
