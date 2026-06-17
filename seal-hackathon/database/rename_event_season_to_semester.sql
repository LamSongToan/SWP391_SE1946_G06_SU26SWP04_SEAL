IF COL_LENGTH('HackathonEvent', 'season') IS NOT NULL
   AND COL_LENGTH('HackathonEvent', 'semester') IS NULL
BEGIN
    EXEC sp_rename 'HackathonEvent.season', 'semester', 'COLUMN';
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_HackathonEvent_Year_Season'
      AND object_id = OBJECT_ID('HackathonEvent')
)
BEGIN
    DROP INDEX UQ_HackathonEvent_Year_Season ON HackathonEvent;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_HackathonEvent_Year_Semester'
      AND object_id = OBJECT_ID('HackathonEvent')
)
BEGIN
    CREATE UNIQUE INDEX UQ_HackathonEvent_Year_Semester
    ON HackathonEvent (year, semester);
END
GO
