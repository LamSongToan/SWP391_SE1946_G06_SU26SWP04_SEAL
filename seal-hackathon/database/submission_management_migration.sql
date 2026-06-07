-- =======================================================
-- SEAL Sprint 2 - Submission Management Migration
-- Run this script on existing SQL Server databases before enabling the
-- submission management backend APIs.
-- =======================================================

-- Keep Team status consistent with the Spring Boot entity and team workflow.
DECLARE @teamDefaultConstraint NVARCHAR(128);
DECLARE @sql NVARCHAR(MAX);
SELECT @teamDefaultConstraint = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.default_object_id = dc.object_id
JOIN sys.tables t ON t.object_id = c.object_id
WHERE t.name = 'Team' AND SCHEMA_NAME(t.schema_id) = 'dbo' AND c.name = 'status';

IF @teamDefaultConstraint IS NOT NULL
BEGIN
    SET @sql = N'ALTER TABLE dbo.[Team] DROP CONSTRAINT ' + QUOTENAME(@teamDefaultConstraint);
    EXEC sp_executesql @sql;
END;

IF OBJECT_ID('dbo.Team', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.Team', 'status') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1
       FROM sys.default_constraints dc
       JOIN sys.columns c ON c.default_object_id = dc.object_id
       JOIN sys.tables t ON t.object_id = c.object_id
       WHERE t.name = 'Team' AND SCHEMA_NAME(t.schema_id) = 'dbo' AND c.name = 'status'
   )
    ALTER TABLE dbo.[Team] ADD CONSTRAINT DF_Team_Status DEFAULT 'Forming' FOR status;
GO

-- Create Submission when the current Sprint 1 database has not added the scoring schema yet.
IF OBJECT_ID('dbo.Submission', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Submission (
        submission_id INT IDENTITY(1,1) PRIMARY KEY,
        team_id INT NOT NULL,
        round_id INT NOT NULL,
        repository_url VARCHAR(1000) NOT NULL,
        demo_url VARCHAR(1000) NULL,
        slide_url VARCHAR(1000) NULL,
        github_metadata NVARCHAR(MAX) NULL,
        is_calibration BIT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'Submitted',
        submitted_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NULL,
        submitted_by_user_role_id INT NULL,
        CONSTRAINT CK_Submission_Status
            CHECK (status IN ('Submitted', 'Evaluating', 'Qualified', 'Eliminated')),
        CONSTRAINT FK_Submission_Team
            FOREIGN KEY (team_id) REFERENCES dbo.[Team](team_id),
        CONSTRAINT FK_Submission_Round
            FOREIGN KEY (round_id) REFERENCES dbo.[Round](round_id),
        CONSTRAINT FK_Submission_SubmittedByStudent
            FOREIGN KEY (submitted_by_user_role_id) REFERENCES dbo.StudentProfile(user_role_id),
        CONSTRAINT UQ_Submission_Team_Round UNIQUE(team_id, round_id)
    );
END;
GO

-- Extend URL columns. Long GitHub/GitLab, demo, report, and slide URLs often exceed 255 chars.
IF COL_LENGTH('dbo.Submission', 'repository_url') IS NOT NULL
    EXEC sp_executesql N'ALTER TABLE dbo.Submission ALTER COLUMN repository_url VARCHAR(1000) NOT NULL';
GO

IF COL_LENGTH('dbo.Submission', 'demo_url') IS NOT NULL
    EXEC sp_executesql N'ALTER TABLE dbo.Submission ALTER COLUMN demo_url VARCHAR(1000) NULL';
GO

IF COL_LENGTH('dbo.Submission', 'slide_url') IS NOT NULL
    EXEC sp_executesql N'ALTER TABLE dbo.Submission ALTER COLUMN slide_url VARCHAR(1000) NULL';
GO

-- Track who created/last updated the submission.
IF COL_LENGTH('dbo.Submission', 'submitted_by_user_role_id') IS NULL
BEGIN
    ALTER TABLE dbo.Submission ADD submitted_by_user_role_id INT NULL;
END;
GO

IF COL_LENGTH('dbo.Submission', 'submitted_by_user_role_id') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Submission_SubmittedByStudent')
BEGIN
    ALTER TABLE dbo.Submission ADD CONSTRAINT FK_Submission_SubmittedByStudent
        FOREIGN KEY (submitted_by_user_role_id) REFERENCES dbo.StudentProfile(user_role_id);
END;
GO

IF COL_LENGTH('dbo.Submission', 'updated_at') IS NULL
    ALTER TABLE dbo.Submission ADD updated_at DATETIME NULL;
GO

UPDATE dbo.Submission
SET updated_at = submitted_at
WHERE updated_at IS NULL;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'UQ_Submission_Team_Round'
)
    ALTER TABLE dbo.Submission ADD CONSTRAINT UQ_Submission_Team_Round UNIQUE(team_id, round_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Submission_Team' AND object_id = OBJECT_ID('dbo.Submission'))
    CREATE INDEX IX_Submission_Team ON dbo.Submission(team_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Submission_Round' AND object_id = OBJECT_ID('dbo.Submission'))
    CREATE INDEX IX_Submission_Round ON dbo.Submission(round_id);
GO

IF OBJECT_ID('dbo.SubmissionHistory', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubmissionHistory (
        history_id INT IDENTITY(1,1) PRIMARY KEY,
        submission_id INT NOT NULL,
        changed_by_user_role_id INT NULL,
        action_type VARCHAR(50) NOT NULL,
        old_repository_url VARCHAR(1000) NULL,
        new_repository_url VARCHAR(1000) NULL,
        old_demo_url VARCHAR(1000) NULL,
        new_demo_url VARCHAR(1000) NULL,
        old_slide_url VARCHAR(1000) NULL,
        new_slide_url VARCHAR(1000) NULL,
        old_status VARCHAR(50) NULL,
        new_status VARCHAR(50) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_SubmissionHistory_Submission
            FOREIGN KEY (submission_id) REFERENCES dbo.Submission(submission_id) ON DELETE CASCADE,
        CONSTRAINT FK_SubmissionHistory_ChangedByStudent
            FOREIGN KEY (changed_by_user_role_id) REFERENCES dbo.StudentProfile(user_role_id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SubmissionHistory_Submission' AND object_id = OBJECT_ID('dbo.SubmissionHistory'))
    CREATE INDEX IX_SubmissionHistory_Submission ON dbo.SubmissionHistory(submission_id, created_at DESC);
GO

-- Minimal Ranking table for Sprint 1 databases that do not have the scoring/ranking schema yet.
-- Sprint 2 only needs this table to check whether a team is qualified for the next round.
IF OBJECT_ID('dbo.Ranking', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Ranking (
        ranking_id INT IDENTITY(1,1) PRIMARY KEY,
        team_id INT NOT NULL,
        round_id INT NOT NULL,
        prize_id INT NULL,
        rank_position INT NOT NULL,
        total_score DECIMAL(5,2) NOT NULL DEFAULT 0,
        qualified_next_round BIT NOT NULL DEFAULT 0,
        calculated_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Ranking_Team
            FOREIGN KEY (team_id) REFERENCES dbo.[Team](team_id),
        CONSTRAINT FK_Ranking_Round
            FOREIGN KEY (round_id) REFERENCES dbo.[Round](round_id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Ranking_Team_Round' AND object_id = OBJECT_ID('dbo.Ranking'))
    CREATE INDEX IX_Ranking_Team_Round ON dbo.Ranking(team_id, round_id, qualified_next_round);
GO
