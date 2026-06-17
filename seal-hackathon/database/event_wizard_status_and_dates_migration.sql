USE SEAL_Hackathon_G06;
GO

IF COL_LENGTH('HackathonEvent', 'registration_start_at') IS NULL
    ALTER TABLE HackathonEvent ADD registration_start_at DATETIME NULL;
GO
IF COL_LENGTH('HackathonEvent', 'registration_end_at') IS NULL
    ALTER TABLE HackathonEvent ADD registration_end_at DATETIME NULL;
GO
IF COL_LENGTH('HackathonEvent', 'competition_start_at') IS NULL
    ALTER TABLE HackathonEvent ADD competition_start_at DATETIME NULL;
GO
IF COL_LENGTH('HackathonEvent', 'competition_end_at') IS NULL
    ALTER TABLE HackathonEvent ADD competition_end_at DATETIME NULL;
GO
IF COL_LENGTH('HackathonEvent', 'track_selection_mode') IS NULL
    ALTER TABLE HackathonEvent ADD track_selection_mode VARCHAR(30) NULL;
GO
IF COL_LENGTH('HackathonEvent', 'ranking_method') IS NULL
    ALTER TABLE HackathonEvent ADD ranking_method VARCHAR(50) NULL;
GO
IF COL_LENGTH('HackathonEvent', 'awards_json') IS NULL
    ALTER TABLE HackathonEvent ADD awards_json NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH('HackathonEvent', 'scoring_criteria_json') IS NULL
    ALTER TABLE HackathonEvent ADD scoring_criteria_json NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH('HackathonEvent', 'published_at') IS NULL
    ALTER TABLE HackathonEvent ADD published_at DATETIME NULL;
GO

ALTER TABLE HackathonEvent ALTER COLUMN description NVARCHAR(MAX) NULL;
GO
ALTER TABLE HackathonEvent ALTER COLUMN awards_json NVARCHAR(MAX) NULL;
GO
ALTER TABLE HackathonEvent ALTER COLUMN scoring_criteria_json NVARCHAR(MAX) NULL;
GO

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_HackathonEvent_Status_BusinessRule'
      AND parent_object_id = OBJECT_ID('HackathonEvent')
)
BEGIN
    ALTER TABLE HackathonEvent DROP CONSTRAINT CK_HackathonEvent_Status_BusinessRule;
END
GO

UPDATE HackathonEvent
SET status = CASE
    WHEN UPPER(status) IN ('DRAFT', 'UPCOMING') THEN 'Draft'
    WHEN UPPER(status) IN ('ONGOING', 'ACTIVE', 'CONFIGURED', 'REGISTRATIONOPEN', 'SCORING', 'RESULTPUBLISHED') THEN 'Ongoing'
    ELSE 'Ended'
END;
GO

ALTER TABLE HackathonEvent
ADD CONSTRAINT CK_HackathonEvent_Status_BusinessRule
CHECK (status IN ('Draft', 'Ongoing', 'Ended'));
GO

ALTER TABLE HackathonEvent ALTER COLUMN start_date DATE NULL;
GO
ALTER TABLE HackathonEvent ALTER COLUMN end_date DATE NULL;
GO

IF COL_LENGTH('Round', 'start_at') IS NULL
    ALTER TABLE Round ADD start_at DATETIME NULL;
GO
IF COL_LENGTH('Round', 'end_at') IS NULL
    ALTER TABLE Round ADD end_at DATETIME NULL;
GO
IF COL_LENGTH('Round', 'is_final') IS NULL
    ALTER TABLE Round ADD is_final BIT NOT NULL CONSTRAINT DF_Round_IsFinal DEFAULT 0;
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('Round')
      AND name = 'promotion_rule_top_n'
      AND is_nullable = 0
)
BEGIN
    ALTER TABLE Round ALTER COLUMN promotion_rule_top_n INT NULL;
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('Round')
      AND name = 'submission_deadline'
      AND is_nullable = 0
)
BEGIN
    ALTER TABLE Round ALTER COLUMN submission_deadline DATETIME NULL;
END
GO
