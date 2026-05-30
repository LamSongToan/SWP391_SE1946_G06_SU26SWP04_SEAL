package com.seal.hackathon.event.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "Round")
public class RoundEntity {

    @Id
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

    public Integer getRoundId() {
        return roundId;
    }

    public Integer getEventId() {
        return eventId;
    }

    public String getRoundName() {
        return roundName;
    }

    public Integer getRoundOrder() {
        return roundOrder;
    }

    public LocalDateTime getSubmissionDeadline() {
        return submissionDeadline;
    }
}
