package com.seal.hackathon.event.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;

@Entity
@Table(name = "HackathonEvent")
public class HackathonEventEntity {

    @Id
    @Column(name = "event_id")
    private Integer eventId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "season", nullable = false)
    private String season;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "status")
    private String status;

    @Column(name = "description")
    private String description;

    public Integer getEventId() {
        return eventId;
    }

    public String getName() {
        return name;
    }

    public String getSeason() {
        return season;
    }

    public Integer getYear() {
        return year;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public String getStatus() {
        return status;
    }

    public String getDescription() {
        return description;
    }
}
