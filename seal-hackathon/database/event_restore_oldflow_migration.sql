USE SEAL_Hackathon_G06;
GO

IF COL_LENGTH('HackathonEvent', 'semester') IS NULL
BEGIN
    ALTER TABLE HackathonEvent ADD semester VARCHAR(20) NULL;
END
GO

IF COL_LENGTH('HackathonEvent', 'year') IS NULL
BEGIN
    ALTER TABLE HackathonEvent ADD year INT NULL;
END
GO

IF COL_LENGTH('HackathonEvent', 'start_date') IS NULL
BEGIN
    ALTER TABLE HackathonEvent ADD start_date DATE NULL;
END
GO

IF COL_LENGTH('HackathonEvent', 'end_date') IS NULL
BEGIN
    ALTER TABLE HackathonEvent ADD end_date DATE NULL;
END
GO

IF COL_LENGTH('HackathonEvent', 'configuration_json') IS NOT NULL
BEGIN
    ALTER TABLE HackathonEvent DROP COLUMN configuration_json;
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_HackathonEvent_Status_BusinessRule'
)
BEGIN
    ALTER TABLE HackathonEvent DROP CONSTRAINT CK_HackathonEvent_Status_BusinessRule;
END
GO

UPDATE HackathonEvent
SET semester = COALESCE(
        semester,
        CASE (ABS(CHECKSUM(event_id)) % 3)
            WHEN 0 THEN 'Spring'
            WHEN 1 THEN 'Summer'
            ELSE 'Fall'
        END
    ),
    year = COALESCE(year, YEAR(GETDATE()) + event_id - 1),
    start_date = COALESCE(
        start_date,
        CASE COALESCE(
            semester,
            CASE (ABS(CHECKSUM(event_id)) % 3)
                WHEN 0 THEN 'Spring'
                WHEN 1 THEN 'Summer'
                ELSE 'Fall'
            END
        )
            WHEN 'Spring' THEN DATEFROMPARTS(COALESCE(year, YEAR(GETDATE()) + event_id - 1), 1, 1)
            WHEN 'Summer' THEN DATEFROMPARTS(COALESCE(year, YEAR(GETDATE()) + event_id - 1), 5, 1)
            ELSE DATEFROMPARTS(COALESCE(year, YEAR(GETDATE()) + event_id - 1), 9, 1)
        END
    ),
    end_date = COALESCE(
        end_date,
        CASE COALESCE(
            semester,
            CASE (ABS(CHECKSUM(event_id)) % 3)
                WHEN 0 THEN 'Spring'
                WHEN 1 THEN 'Summer'
                ELSE 'Fall'
            END
        )
            WHEN 'Spring' THEN DATEFROMPARTS(COALESCE(year, YEAR(GETDATE()) + event_id - 1), 4, 30)
            WHEN 'Summer' THEN DATEFROMPARTS(COALESCE(year, YEAR(GETDATE()) + event_id - 1), 8, 31)
            ELSE DATEFROMPARTS(COALESCE(year, YEAR(GETDATE()) + event_id - 1), 12, 31)
        END
    ),
    status = CASE
        WHEN status IN ('Draft', 'Ongoing', 'Ended') THEN status
        WHEN UPPER(status) IN ('DRAFT', 'UPCOMING') THEN 'Draft'
        WHEN UPPER(status) IN ('ONGOING', 'ACTIVE', 'CONFIGURED', 'REGISTRATIONOPEN', 'SCORING', 'RESULTPUBLISHED') THEN 'Ongoing'
        WHEN UPPER(status) IN ('CLOSED', 'CANCELLED', 'COMPLETED', 'FINISHED') THEN 'Ended'
        ELSE 'Draft'
    END;
GO

ALTER TABLE HackathonEvent
ALTER COLUMN semester VARCHAR(20) NOT NULL;
GO

ALTER TABLE HackathonEvent
ALTER COLUMN year INT NOT NULL;
GO

ALTER TABLE HackathonEvent
ALTER COLUMN start_date DATE NOT NULL;
GO

ALTER TABLE HackathonEvent
ALTER COLUMN end_date DATE NOT NULL;
GO

ALTER TABLE HackathonEvent
ADD CONSTRAINT CK_HackathonEvent_Status_BusinessRule
CHECK (status IN ('Draft', 'Ongoing', 'Ended'));
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
