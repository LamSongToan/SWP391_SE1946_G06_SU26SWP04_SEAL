package com.seal.hackathon.submission.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ScoreDto(
        Integer scoreId,
        Integer submissionId,
        String teamName,
        String roundName,
        Integer criteriaId,
        String criteriaName,
        Integer judgeAssignmentId,
        Integer judgeUserRoleId,
        String judgeName,
        BigDecimal scoreValue,
        String comment,
        LocalDateTime scoredAt
) {}