package com.seal.hackathon.auth.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AuthSchemaRepairService {

    public AuthSchemaRepairService(JdbcTemplate jdbcTemplate) {
        jdbcTemplate.execute("""
                IF COL_LENGTH('dbo.Users', 'must_change_password') IS NULL
                BEGIN
                    ALTER TABLE dbo.[Users]
                    ADD must_change_password BIT NOT NULL
                        CONSTRAINT DF_Users_MustChangePassword DEFAULT 0;
                END;

                UPDATE dbo.[Users]
                SET must_change_password = 0
                WHERE must_change_password IS NULL;
                """);
    }
}
