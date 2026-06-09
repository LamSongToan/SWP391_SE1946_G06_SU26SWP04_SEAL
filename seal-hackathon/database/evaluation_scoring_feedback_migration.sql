USE SEAL_Hackathon_G06;
GO

-- Sprint 2 continuation: Judge/Mentor dashboard, criterion-level scoring, feedback history.
-- Safe to rerun on existing local databases.

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

SELECT
    COL_LENGTH('dbo.[Round]', 'score_locked') AS RoundScoreLockedBytes,
    OBJECT_ID('dbo.Feedback') AS FeedbackTable,
    OBJECT_ID('dbo.Score') AS ScoreTable,
    OBJECT_ID('dbo.JudgeEvaluation') AS JudgeEvaluationTable,
    OBJECT_ID('dbo.ScoreHistory') AS ScoreHistoryTable;
GO
