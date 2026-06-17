package com.seal.hackathon.team.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class TeamSchemaRepairService {

    public TeamSchemaRepairService(JdbcTemplate jdbcTemplate) {
        jdbcTemplate.execute("""
                IF EXISTS (
                    SELECT 1
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = 'Team'
                      AND COLUMN_NAME = 'track_id'
                      AND IS_NULLABLE = 'NO'
                )
                BEGIN
                    ALTER TABLE Team ALTER COLUMN track_id INT NULL;
                END
                """);
    }
}
