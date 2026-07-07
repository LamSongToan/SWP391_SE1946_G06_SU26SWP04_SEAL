package com.seal.hackathon.team.entity;

import com.seal.hackathon.auth.entity.StudentProfileEntity;
import com.seal.hackathon.event.entity.HackathonEventEntity;
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
@Table(name = "IndividualRegistration")
public class IndividualRegistrationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "individual_registration_id")
    private Integer individualRegistrationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private HackathonEventEntity event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_role_id", nullable = false)
    private StudentProfileEntity student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_team_id")
    private TeamEntity assignedTeam;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "matched_at")
    private LocalDateTime matchedAt;

    @PrePersist
    public void prePersist() {
        if (status == null) {
            status = "Waiting";
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
