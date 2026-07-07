USE SEAL_Hackathon_G06;
GO

IF COL_LENGTH('HackathonEvent', 'min_team_size') IS NULL
BEGIN
    ALTER TABLE HackathonEvent ADD min_team_size INT NULL;
END
GO

IF COL_LENGTH('HackathonEvent', 'max_team_size') IS NULL
BEGIN
    ALTER TABLE HackathonEvent ADD max_team_size INT NULL;
END
GO

IF COL_LENGTH('Track', 'min_teams') IS NULL
BEGIN
    ALTER TABLE Track ADD min_teams INT NULL;
END
GO

IF COL_LENGTH('Track', 'max_teams') IS NULL
BEGIN
    ALTER TABLE Track ADD max_teams INT NULL;
END
GO

IF OBJECT_ID('IndividualRegistration', 'U') IS NULL
BEGIN
    CREATE TABLE IndividualRegistration (
        individual_registration_id INT IDENTITY(1,1) PRIMARY KEY,
        event_id INT NOT NULL,
        user_role_id INT NOT NULL,
        assigned_team_id INT NULL,
        status VARCHAR(30) NOT NULL CONSTRAINT DF_IndividualRegistration_Status DEFAULT 'Waiting',
        created_at DATETIME2 NOT NULL CONSTRAINT DF_IndividualRegistration_CreatedAt DEFAULT SYSUTCDATETIME(),
        matched_at DATETIME2 NULL,
        CONSTRAINT FK_IndividualRegistration_Event FOREIGN KEY (event_id) REFERENCES HackathonEvent(event_id),
        CONSTRAINT FK_IndividualRegistration_Student FOREIGN KEY (user_role_id) REFERENCES StudentProfile(user_role_id),
        CONSTRAINT FK_IndividualRegistration_Team FOREIGN KEY (assigned_team_id) REFERENCES Team(team_id)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_IndividualRegistration_Event_Student'
      AND object_id = OBJECT_ID('IndividualRegistration')
)
BEGIN
    CREATE UNIQUE INDEX UX_IndividualRegistration_Event_Student
    ON IndividualRegistration(event_id, user_role_id);
END
GO
