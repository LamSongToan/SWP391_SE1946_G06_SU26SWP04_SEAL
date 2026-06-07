-- =======================================================
-- SEAL Database Team Update - All In One
--
-- Use this single script for teammates who already have an existing
-- SEAL_Hackathon_G06 database from the earlier project schema.
--
-- Includes:
-- 1. Business-rule status alignment
-- 2. Account rejection reason column with Unicode support
-- 3. Event/track/round uniqueness constraints
-- 4. Submission management, validation, and history database objects
--
-- Do not run the full seal_hackathon.sql after this on the same database.
-- That file is for creating a fresh database from scratch.
-- =======================================================

USE SEAL_Hackathon_G06;
GO

-- =======================================================
-- 1. Users status + rejection reason
-- =======================================================

IF COL_LENGTH('dbo.Users', 'rejection_reason') IS NULL
BEGIN
    ALTER TABLE dbo.[Users]
    ADD rejection_reason NVARCHAR(1000) NULL;
END;
GO

IF COL_LENGTH('dbo.Users', 'rejection_reason') IS NOT NULL
BEGIN
    ALTER TABLE dbo.[Users]
    ALTER COLUMN rejection_reason NVARCHAR(1000) NULL;
END;
GO

DECLARE @dropUsersStatusSql NVARCHAR(MAX) = N'';

SELECT @dropUsersStatusSql += N'ALTER TABLE dbo.[Users] DROP CONSTRAINT ' + QUOTENAME(cc.name) + N';'
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID(N'dbo.Users')
  AND cc.definition LIKE '%status%';

IF @dropUsersStatusSql <> N''
BEGIN
    EXEC sp_executesql @dropUsersStatusSql;
END;
GO

UPDATE dbo.[Users]
SET status = CASE
    WHEN UPPER(status) IN ('PENDING', 'PENDINGAPPROVAL', 'PENDING_APPROVAL') THEN 'PendingApproval'
    WHEN UPPER(status) IN ('APPROVED', 'ACTIVE') THEN 'Active'
    WHEN UPPER(status) = 'REJECTED' THEN 'Rejected'
    WHEN UPPER(status) IN ('DISABLED', 'SUSPENDED') THEN 'Suspended'
    ELSE status
END
WHERE status IS NOT NULL;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_Users_Status_BusinessRule'
      AND parent_object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    ALTER TABLE dbo.[Users]
    ADD CONSTRAINT CK_Users_Status_BusinessRule
    CHECK (status IN ('PendingApproval', 'Active', 'Rejected', 'Suspended'));
END;
GO

-- =======================================================
-- 2. Hackathon event status + core uniqueness constraints
-- =======================================================

DECLARE @dropEventStatusSql NVARCHAR(MAX) = N'';

SELECT @dropEventStatusSql += N'ALTER TABLE dbo.HackathonEvent DROP CONSTRAINT ' + QUOTENAME(cc.name) + N';'
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID(N'dbo.HackathonEvent')
  AND cc.definition LIKE '%status%';

IF @dropEventStatusSql <> N''
BEGIN
    EXEC sp_executesql @dropEventStatusSql;
END;
GO

UPDATE dbo.HackathonEvent
SET status = CASE
    WHEN UPPER(status) IN ('UPCOMING', 'DRAFT') THEN 'Draft'
    WHEN UPPER(status) IN ('ACTIVE', 'ONGOING') THEN 'Ongoing'
    ELSE status
END
WHERE status IS NOT NULL;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_HackathonEvent_Status_BusinessRule'
      AND parent_object_id = OBJECT_ID(N'dbo.HackathonEvent')
)
BEGIN
    ALTER TABLE dbo.HackathonEvent
    ADD CONSTRAINT CK_HackathonEvent_Status_BusinessRule
    CHECK (status IN ('Draft', 'Configured', 'RegistrationOpen', 'Ongoing', 'Scoring', 'ResultPublished', 'Closed', 'Cancelled'));
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE name = 'UQ_HackathonEvent_Year_Season'
      AND parent_object_id = OBJECT_ID(N'dbo.HackathonEvent')
)
BEGIN
    ALTER TABLE dbo.HackathonEvent
    ADD CONSTRAINT UQ_HackathonEvent_Year_Season UNIQUE (year, season);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE name = 'UQ_Track_Event_Name'
      AND parent_object_id = OBJECT_ID(N'dbo.Track')
)
BEGIN
    ALTER TABLE dbo.Track
    ADD CONSTRAINT UQ_Track_Event_Name UNIQUE (event_id, name);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE name = 'UQ_Round_Event_Order'
      AND parent_object_id = OBJECT_ID(N'dbo.Round')
)
BEGIN
    ALTER TABLE dbo.[Round]
    ADD CONSTRAINT UQ_Round_Event_Order UNIQUE (event_id, round_order);
END;
GO

-- =======================================================
-- 3. Team status default alignment
-- =======================================================

DECLARE @teamDefaultConstraint NVARCHAR(128);
DECLARE @teamDefaultSql NVARCHAR(MAX);

SELECT @teamDefaultConstraint = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.default_object_id = dc.object_id
JOIN sys.tables t ON t.object_id = c.object_id
WHERE t.name = 'Team'
  AND SCHEMA_NAME(t.schema_id) = 'dbo'
  AND c.name = 'status';

IF @teamDefaultConstraint IS NOT NULL
BEGIN
    SET @teamDefaultSql = N'ALTER TABLE dbo.[Team] DROP CONSTRAINT ' + QUOTENAME(@teamDefaultConstraint);
    EXEC sp_executesql @teamDefaultSql;
END;
GO

IF OBJECT_ID('dbo.Team', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.Team', 'status') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1
       FROM sys.default_constraints dc
       JOIN sys.columns c ON c.default_object_id = dc.object_id
       JOIN sys.tables t ON t.object_id = c.object_id
       WHERE t.name = 'Team'
         AND SCHEMA_NAME(t.schema_id) = 'dbo'
         AND c.name = 'status'
   )
BEGIN
    ALTER TABLE dbo.[Team] ADD CONSTRAINT DF_Team_Status DEFAULT 'Forming' FOR status;
END;
GO

-- =======================================================
-- 4. Submission table
-- =======================================================

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

IF COL_LENGTH('dbo.Submission', 'repository_url') IS NULL
BEGIN
    ALTER TABLE dbo.Submission ADD repository_url VARCHAR(1000) NULL;
END;
GO

UPDATE dbo.Submission
SET repository_url = 'https://github.com/seal/legacy-submission-' + CAST(submission_id AS VARCHAR(20))
WHERE repository_url IS NULL;
GO

IF COL_LENGTH('dbo.Submission', 'repository_url') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Submission ALTER COLUMN repository_url VARCHAR(1000) NOT NULL;
END;
GO

IF COL_LENGTH('dbo.Submission', 'demo_url') IS NULL
BEGIN
    ALTER TABLE dbo.Submission ADD demo_url VARCHAR(1000) NULL;
END;
GO

IF COL_LENGTH('dbo.Submission', 'demo_url') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Submission ALTER COLUMN demo_url VARCHAR(1000) NULL;
END;
GO

IF COL_LENGTH('dbo.Submission', 'slide_url') IS NULL
BEGIN
    ALTER TABLE dbo.Submission ADD slide_url VARCHAR(1000) NULL;
END;
GO

IF COL_LENGTH('dbo.Submission', 'slide_url') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Submission ALTER COLUMN slide_url VARCHAR(1000) NULL;
END;
GO

IF COL_LENGTH('dbo.Submission', 'github_metadata') IS NULL
BEGIN
    ALTER TABLE dbo.Submission ADD github_metadata NVARCHAR(MAX) NULL;
END;
GO

IF COL_LENGTH('dbo.Submission', 'is_calibration') IS NULL
BEGIN
    ALTER TABLE dbo.Submission ADD is_calibration BIT NOT NULL
        CONSTRAINT DF_Submission_IsCalibration DEFAULT 0;
END;
GO

IF COL_LENGTH('dbo.Submission', 'status') IS NULL
BEGIN
    ALTER TABLE dbo.Submission ADD status VARCHAR(50) NOT NULL
        CONSTRAINT DF_Submission_Status DEFAULT 'Submitted';
END;
GO

IF COL_LENGTH('dbo.Submission', 'submitted_at') IS NULL
BEGIN
    ALTER TABLE dbo.Submission ADD submitted_at DATETIME NOT NULL
        CONSTRAINT DF_Submission_SubmittedAt DEFAULT GETDATE();
END;
GO

IF COL_LENGTH('dbo.Submission', 'updated_at') IS NULL
BEGIN
    ALTER TABLE dbo.Submission ADD updated_at DATETIME NULL;
END;
GO

UPDATE dbo.Submission
SET updated_at = submitted_at
WHERE updated_at IS NULL;
GO

IF COL_LENGTH('dbo.Submission', 'submitted_by_user_role_id') IS NULL
BEGIN
    ALTER TABLE dbo.Submission ADD submitted_by_user_role_id INT NULL;
END;
GO

IF COL_LENGTH('dbo.Submission', 'submitted_by_user_role_id') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1 FROM sys.foreign_keys
       WHERE name = 'FK_Submission_SubmittedByStudent'
         AND parent_object_id = OBJECT_ID(N'dbo.Submission')
   )
BEGIN
    ALTER TABLE dbo.Submission ADD CONSTRAINT FK_Submission_SubmittedByStudent
        FOREIGN KEY (submitted_by_user_role_id) REFERENCES dbo.StudentProfile(user_role_id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_Submission_Status'
      AND parent_object_id = OBJECT_ID(N'dbo.Submission')
)
BEGIN
    ALTER TABLE dbo.Submission ADD CONSTRAINT CK_Submission_Status
        CHECK (status IN ('Submitted', 'Evaluating', 'Qualified', 'Eliminated'));
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'UQ_Submission_Team_Round'
      AND parent_object_id = OBJECT_ID(N'dbo.Submission')
)
BEGIN
    ALTER TABLE dbo.Submission ADD CONSTRAINT UQ_Submission_Team_Round UNIQUE(team_id, round_id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Submission_Team' AND object_id = OBJECT_ID('dbo.Submission'))
BEGIN
    CREATE INDEX IX_Submission_Team ON dbo.Submission(team_id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Submission_Round' AND object_id = OBJECT_ID('dbo.Submission'))
BEGIN
    CREATE INDEX IX_Submission_Round ON dbo.Submission(round_id);
END;
GO

-- =======================================================
-- 5. Submission history
-- =======================================================

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
BEGIN
    CREATE INDEX IX_SubmissionHistory_Submission ON dbo.SubmissionHistory(submission_id, created_at DESC);
END;
GO

-- =======================================================
-- 6. Minimal ranking table for next-round submission checks
-- =======================================================

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
BEGIN
    CREATE INDEX IX_Ranking_Team_Round ON dbo.Ranking(team_id, round_id, qualified_next_round);
END;
GO

-- =======================================================
-- 7. Verification output
-- =======================================================

PRINT 'SEAL all-in-one team database update completed.';
GO

SELECT
    OBJECT_ID('dbo.Users') AS UsersTable,
    OBJECT_ID('dbo.HackathonEvent') AS HackathonEventTable,
    OBJECT_ID('dbo.Submission') AS SubmissionTable,
    OBJECT_ID('dbo.SubmissionHistory') AS SubmissionHistoryTable,
    OBJECT_ID('dbo.Ranking') AS RankingTable;
GO

SELECT
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE (TABLE_NAME = 'Users' AND COLUMN_NAME = 'rejection_reason')
   OR TABLE_NAME IN ('Submission', 'SubmissionHistory', 'Ranking')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
GO
