package com.seal.hackathon.submission.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SubmissionSchemaRepairService {

    public SubmissionSchemaRepairService(JdbcTemplate jdbcTemplate) {
        jdbcTemplate.execute("""
                DECLARE @sql NVARCHAR(MAX) = N'';

                SELECT @sql = @sql + N'ALTER TABLE dbo.Submission DROP CONSTRAINT [' + dc.name + N'];' + CHAR(10)
                FROM sys.check_constraints dc
                JOIN sys.columns c
                  ON c.object_id = dc.parent_object_id
                 AND c.column_id = dc.parent_column_id
                WHERE OBJECT_NAME(dc.parent_object_id) = 'Submission'
                  AND c.name = 'status'
                  AND dc.name <> 'CK_Submission_Status';

                IF @sql <> N''
                BEGIN
                    EXEC sp_executesql @sql;
                END;

                IF EXISTS (
                    SELECT 1
                    FROM sys.check_constraints
                    WHERE name = 'CK_Submission_Status'
                      AND definition NOT LIKE '%Disqualified%'
                )
                BEGIN
                    ALTER TABLE dbo.Submission DROP CONSTRAINT CK_Submission_Status;
                END;

                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.check_constraints
                    WHERE name = 'CK_Submission_Status'
                )
                BEGIN
                    ALTER TABLE dbo.Submission WITH CHECK
                    ADD CONSTRAINT CK_Submission_Status
                    CHECK ([status] IN ('Submitted', 'Evaluating', 'Qualified', 'Eliminated', 'Disqualified', 'Finalized'));
                END;
                """);
    }
}
