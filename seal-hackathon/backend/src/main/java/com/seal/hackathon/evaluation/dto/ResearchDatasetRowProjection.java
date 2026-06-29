package com.seal.hackathon.evaluation.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface ResearchDatasetRowProjection {
    Integer getEventId();
    String getEventSemester();
    Integer getEventYear();
    Integer getRoundId();
    Integer getRoundOrder();
    String getRoundName();
    Integer getTrackId();
    String getTrackName();
    Integer getTeamId();
    Integer getSubmissionId();
    String getSubmissionStatus();
    Boolean getCalibration();
    Integer getJudgeAssignmentId();
    Integer getCriteriaId();
    String getCriteriaName();
    String getCriteriaType();
    BigDecimal getCriteriaWeight();
    BigDecimal getScoreValue();
    LocalDateTime getSubmittedAt();
    LocalDateTime getScoredAt();
}
