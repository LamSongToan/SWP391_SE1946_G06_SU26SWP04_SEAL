package com.seal.hackathon.event.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "HackathonEvent")
public class HackathonEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Integer eventId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "semester")
    private String semester;

    @Column(name = "year")
    private Integer year;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "status")
    private String status;

    @Lob
    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "registration_start_at")
    private LocalDateTime registrationStartAt;

    @Column(name = "registration_end_at")
    private LocalDateTime registrationEndAt;

    @Column(name = "competition_start_at")
    private LocalDateTime competitionStartAt;

    @Column(name = "competition_end_at")
    private LocalDateTime competitionEndAt;

    @Column(name = "track_selection_mode")
    private String trackSelectionMode;

    @Column(name = "ranking_method")
    private String rankingMethod;

    @Lob
    @Column(name = "awards_json", columnDefinition = "NVARCHAR(MAX)")
    private String awardsJson;

    @Lob
    @Column(name = "scoring_criteria_json", columnDefinition = "NVARCHAR(MAX)")
    private String scoringCriteriaJson;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;
}
