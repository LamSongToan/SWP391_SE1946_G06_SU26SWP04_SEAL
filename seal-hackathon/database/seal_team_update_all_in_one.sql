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

-- =======================================================
-- 5. Criteria templates for reusable rubrics
-- =======================================================

IF OBJECT_ID('dbo.CriteriaTemplate', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CriteriaTemplate (
        template_id INT IDENTITY(1,1) PRIMARY KEY,
        template_name NVARCHAR(150) NOT NULL,
        description NVARCHAR(500) NULL,
        created_by_user_id INT NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_CriteriaTemplate_CreatedBy
            FOREIGN KEY (created_by_user_id) REFERENCES dbo.[Users](user_id)
    );
END;
GO

IF OBJECT_ID('dbo.CriteriaTemplateItem', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CriteriaTemplateItem (
        template_item_id INT IDENTITY(1,1) PRIMARY KEY,
        template_id INT NOT NULL,
        criteria_name NVARCHAR(150) NOT NULL,
        weight DECIMAL(5,2) NOT NULL,
        criteria_type VARCHAR(50) NOT NULL,
        sort_order INT NOT NULL,
        CONSTRAINT FK_CriteriaTemplateItem_Template
            FOREIGN KEY (template_id) REFERENCES dbo.CriteriaTemplate(template_id) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_CriteriaTemplate_TemplateName'
      AND object_id = OBJECT_ID('dbo.CriteriaTemplate')
)
BEGIN
    CREATE UNIQUE INDEX UQ_CriteriaTemplate_TemplateName
        ON dbo.CriteriaTemplate(template_name);
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
-- 7. Evaluation scoring and feedback history
-- =======================================================

IF COL_LENGTH('dbo.[Round]', 'score_locked') IS NULL
BEGIN
    ALTER TABLE dbo.[Round]
    ADD score_locked BIT NOT NULL
        CONSTRAINT DF_Round_ScoreLocked DEFAULT 0;
END;
GO

UPDATE dbo.[Round]
SET score_locked = 0
WHERE score_locked IS NULL;
GO

IF OBJECT_ID('dbo.Feedback', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Feedback (
        feedback_id INT IDENTITY(1,1) PRIMARY KEY,
        submission_id INT NOT NULL,
        author_user_role_id INT NOT NULL,
        author_role VARCHAR(50) NOT NULL,
        feedback_text NVARCHAR(MAX) NOT NULL,
        created_at DATETIME NOT NULL
            CONSTRAINT DF_Feedback_CreatedAt DEFAULT GETDATE(),
        CONSTRAINT CK_Feedback_AuthorRole
            CHECK (author_role IN ('Judge', 'Mentor', 'Coordinator')),
        CONSTRAINT FK_Feedback_Submission
            FOREIGN KEY (submission_id) REFERENCES dbo.Submission(submission_id) ON DELETE NO ACTION,
        CONSTRAINT FK_Feedback_AuthorRole
            FOREIGN KEY (author_user_role_id) REFERENCES dbo.UserRole(user_role_id) ON DELETE NO ACTION
    );
END;
GO

IF OBJECT_ID('dbo.Feedback', 'U') IS NOT NULL
BEGIN
    DECLARE @feedbackSubmissionFk SYSNAME;
    SELECT TOP 1 @feedbackSubmissionFk = fk.name
    FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID('dbo.Feedback')
      AND fk.referenced_object_id = OBJECT_ID('dbo.Submission')
      AND fk.delete_referential_action = 1;

    IF @feedbackSubmissionFk IS NOT NULL
    BEGIN
        EXEC(N'ALTER TABLE dbo.Feedback DROP CONSTRAINT ' + QUOTENAME(@feedbackSubmissionFk));
        ALTER TABLE dbo.Feedback WITH CHECK
        ADD CONSTRAINT FK_Feedback_Submission
            FOREIGN KEY (submission_id) REFERENCES dbo.Submission(submission_id) ON DELETE NO ACTION;
    END;
END;
GO

IF OBJECT_ID('dbo.JudgeEvaluation', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.JudgeEvaluation (
        evaluation_id INT IDENTITY(1,1) PRIMARY KEY,
        submission_id INT NOT NULL,
        judge_assignment_id INT NOT NULL,
        status VARCHAR(30) NOT NULL CONSTRAINT DF_JudgeEvaluation_Status DEFAULT 'Draft',
        finalized_at DATETIME NULL,
        created_at DATETIME NOT NULL CONSTRAINT DF_JudgeEvaluation_CreatedAt DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL CONSTRAINT DF_JudgeEvaluation_UpdatedAt DEFAULT GETDATE(),
        CONSTRAINT CK_JudgeEvaluation_Status CHECK (status IN ('Draft', 'Finalized')),
        CONSTRAINT UQ_JudgeEvaluation_Submission_Judge UNIQUE (submission_id, judge_assignment_id),
        CONSTRAINT FK_JudgeEvaluation_Submission FOREIGN KEY (submission_id) REFERENCES dbo.Submission(submission_id) ON DELETE NO ACTION,
        CONSTRAINT FK_JudgeEvaluation_Assignment FOREIGN KEY (judge_assignment_id) REFERENCES dbo.JudgeAssignment(judge_assignment_id) ON DELETE NO ACTION
    );
END;
GO

IF OBJECT_ID('dbo.Score', 'U') IS NOT NULL
BEGIN
    DECLARE @scoreSubmissionFk SYSNAME;
    SELECT TOP 1 @scoreSubmissionFk = fk.name
    FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID('dbo.Score')
      AND fk.referenced_object_id = OBJECT_ID('dbo.Submission')
      AND fk.delete_referential_action = 1;

    IF @scoreSubmissionFk IS NOT NULL
    BEGIN
        EXEC(N'ALTER TABLE dbo.Score DROP CONSTRAINT ' + QUOTENAME(@scoreSubmissionFk));
        ALTER TABLE dbo.Score WITH CHECK
        ADD CONSTRAINT FK_Score_Submission
            FOREIGN KEY (submission_id) REFERENCES dbo.Submission(submission_id) ON DELETE NO ACTION;
    END;
END;
GO

IF OBJECT_ID('dbo.JudgeEvaluation', 'U') IS NOT NULL
BEGIN
    DECLARE @judgeEvaluationSubmissionFk SYSNAME;
    SELECT TOP 1 @judgeEvaluationSubmissionFk = fk.name
    FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID('dbo.JudgeEvaluation')
      AND fk.referenced_object_id = OBJECT_ID('dbo.Submission')
      AND fk.delete_referential_action = 1;

    IF @judgeEvaluationSubmissionFk IS NOT NULL
    BEGIN
        EXEC(N'ALTER TABLE dbo.JudgeEvaluation DROP CONSTRAINT ' + QUOTENAME(@judgeEvaluationSubmissionFk));
        ALTER TABLE dbo.JudgeEvaluation WITH CHECK
        ADD CONSTRAINT FK_JudgeEvaluation_Submission
            FOREIGN KEY (submission_id) REFERENCES dbo.Submission(submission_id) ON DELETE NO ACTION;
    END;
END;
GO

IF OBJECT_ID('dbo.ScoreHistory', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ScoreHistory (
        score_history_id INT IDENTITY(1,1) PRIMARY KEY,
        evaluation_id INT NOT NULL,
        criteria_id INT NOT NULL,
        old_score_value DECIMAL(5,2) NULL,
        new_score_value DECIMAL(5,2) NOT NULL,
        old_comment NVARCHAR(MAX) NULL,
        new_comment NVARCHAR(MAX) NULL,
        action_type VARCHAR(30) NOT NULL,
        created_at DATETIME NOT NULL CONSTRAINT DF_ScoreHistory_CreatedAt DEFAULT GETDATE(),
        CONSTRAINT CK_ScoreHistory_Action CHECK (action_type IN ('SAVE_DRAFT', 'FINALIZE', 'REOPEN')),
        CONSTRAINT FK_ScoreHistory_Evaluation FOREIGN KEY (evaluation_id) REFERENCES dbo.JudgeEvaluation(evaluation_id) ON DELETE NO ACTION,
        CONSTRAINT FK_ScoreHistory_Criteria FOREIGN KEY (criteria_id) REFERENCES dbo.ScoringCriteria(criteria_id) ON DELETE NO ACTION
    );
END;
GO

IF OBJECT_ID('dbo.ScoreHistory', 'U') IS NOT NULL
BEGIN
    DECLARE @scoreHistoryEvaluationFk SYSNAME;
    SELECT TOP 1 @scoreHistoryEvaluationFk = fk.name
    FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID('dbo.ScoreHistory')
      AND fk.referenced_object_id = OBJECT_ID('dbo.JudgeEvaluation')
      AND fk.delete_referential_action = 1;

    IF @scoreHistoryEvaluationFk IS NOT NULL
    BEGIN
        EXEC(N'ALTER TABLE dbo.ScoreHistory DROP CONSTRAINT ' + QUOTENAME(@scoreHistoryEvaluationFk));
        ALTER TABLE dbo.ScoreHistory WITH CHECK
        ADD CONSTRAINT FK_ScoreHistory_Evaluation
            FOREIGN KEY (evaluation_id) REFERENCES dbo.JudgeEvaluation(evaluation_id) ON DELETE NO ACTION;
    END;
END;
GO

INSERT INTO dbo.JudgeEvaluation (submission_id, judge_assignment_id, status, finalized_at)
SELECT s.submission_id,
       s.judge_assignment_id,
       CASE WHEN COUNT(DISTINCT s.criteria_id) >= criteria_count.total_count THEN 'Finalized' ELSE 'Draft' END,
       CASE WHEN COUNT(DISTINCT s.criteria_id) >= criteria_count.total_count THEN MAX(s.scored_at) ELSE NULL END
FROM dbo.Score s
JOIN dbo.Submission sub ON sub.submission_id = s.submission_id
CROSS APPLY (
    SELECT COUNT(*) AS total_count
    FROM dbo.ScoringCriteria c
    WHERE c.round_id = sub.round_id
) criteria_count
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.JudgeEvaluation e
    WHERE e.submission_id = s.submission_id
      AND e.judge_assignment_id = s.judge_assignment_id
)
GROUP BY s.submission_id, s.judge_assignment_id, criteria_count.total_count;
GO

IF OBJECT_ID('dbo.Feedback', 'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Feedback ALTER COLUMN feedback_text NVARCHAR(MAX) NOT NULL;
END;
GO

IF OBJECT_ID('dbo.Score', 'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Score ALTER COLUMN comment NVARCHAR(MAX) NULL;
END;
GO

IF OBJECT_ID('dbo.ScoringCriteria', 'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.ScoringCriteria ALTER COLUMN weight DECIMAL(5,2) NOT NULL;
END;
GO

IF OBJECT_ID('dbo.Submission', 'U') IS NOT NULL AND COL_LENGTH('dbo.Submission', 'github_metadata') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Submission ALTER COLUMN github_metadata NVARCHAR(MAX) NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Feedback_Submission' AND object_id = OBJECT_ID('dbo.Feedback'))
BEGIN
    CREATE INDEX IX_Feedback_Submission ON dbo.Feedback(submission_id, created_at DESC);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Feedback_AuthorRole' AND object_id = OBJECT_ID('dbo.Feedback'))
BEGIN
    CREATE INDEX IX_Feedback_AuthorRole ON dbo.Feedback(author_user_role_id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_JudgeEvaluation_Assignment_Status' AND object_id = OBJECT_ID('dbo.JudgeEvaluation'))
BEGIN
    CREATE INDEX IX_JudgeEvaluation_Assignment_Status ON dbo.JudgeEvaluation(judge_assignment_id, status);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ScoreHistory_Evaluation' AND object_id = OBJECT_ID('dbo.ScoreHistory'))
BEGIN
    CREATE INDEX IX_ScoreHistory_Evaluation ON dbo.ScoreHistory(evaluation_id, created_at DESC);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_Score_Submission_Criteria_Judge'
      AND object_id = OBJECT_ID('dbo.Score')
)
BEGIN
    ;WITH duplicates AS (
        SELECT score_id,
               ROW_NUMBER() OVER (
                   PARTITION BY submission_id, criteria_id, judge_assignment_id
                   ORDER BY scored_at DESC, score_id DESC
               ) AS rn
        FROM dbo.Score
    )
    DELETE FROM duplicates WHERE rn > 1;

    ALTER TABLE dbo.Score
    ADD CONSTRAINT UQ_Score_Submission_Criteria_Judge
        UNIQUE (submission_id, criteria_id, judge_assignment_id);
END;
GO

-- =======================================================
-- 8. Verification output
-- =======================================================

PRINT 'SEAL all-in-one team database update completed.';
GO

SELECT
    OBJECT_ID('dbo.Users') AS UsersTable,
    OBJECT_ID('dbo.HackathonEvent') AS HackathonEventTable,
    OBJECT_ID('dbo.Submission') AS SubmissionTable,
    OBJECT_ID('dbo.SubmissionHistory') AS SubmissionHistoryTable,
    OBJECT_ID('dbo.Ranking') AS RankingTable,
    OBJECT_ID('dbo.Feedback') AS FeedbackTable,
    OBJECT_ID('dbo.JudgeEvaluation') AS JudgeEvaluationTable,
    OBJECT_ID('dbo.ScoreHistory') AS ScoreHistoryTable,
    COL_LENGTH('dbo.[Round]', 'score_locked') AS RoundScoreLockedBytes;
GO

SELECT
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE (TABLE_NAME = 'Users' AND COLUMN_NAME = 'rejection_reason')
   OR TABLE_NAME IN ('Submission', 'SubmissionHistory', 'Ranking', 'Feedback', 'JudgeEvaluation', 'ScoreHistory')
   OR (TABLE_NAME = 'Round' AND COLUMN_NAME = 'score_locked')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
GO
