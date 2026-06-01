USE SEAL_Hackathon_G06;
GO

IF COL_LENGTH('Team', 'join_code') IS NULL
BEGIN
    ALTER TABLE Team
    ADD join_code VARCHAR(12) NULL;
END
GO

UPDATE Team
SET join_code = UPPER(LEFT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 8))
WHERE join_code IS NULL;
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('Team')
      AND name = 'join_code'
      AND is_nullable = 1
)
BEGIN
    UPDATE Team
    SET join_code = UPPER(LEFT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 8))
    WHERE join_code IS NULL;

    ALTER TABLE Team
    ALTER COLUMN join_code VARCHAR(12) NOT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes i
    JOIN sys.index_columns ic
      ON ic.object_id = i.object_id
     AND ic.index_id = i.index_id
    JOIN sys.columns c
      ON c.object_id = ic.object_id
     AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID('Team')
      AND i.is_unique = 1
      AND c.name = 'join_code'
)
BEGIN
    ALTER TABLE Team
    ADD CONSTRAINT UQ_Team_JoinCode UNIQUE (join_code);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.columns c
    JOIN sys.default_constraints dc
      ON dc.object_id = c.default_object_id
    WHERE c.object_id = OBJECT_ID('Team')
      AND c.name = 'join_code'
)
BEGIN
    ALTER TABLE Team
    ADD CONSTRAINT DF_Team_JoinCode
        DEFAULT UPPER(LEFT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 8)) FOR join_code;
END
GO

CREATE OR ALTER TRIGGER TR_TeamMember_ValidateRules
ON TeamMember
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT tm.team_id
        FROM TeamMember tm
        JOIN (SELECT DISTINCT team_id FROM inserted) changed ON changed.team_id = tm.team_id
        GROUP BY tm.team_id
        HAVING COUNT(*) > 5
    )
        THROW 50001, 'A team cannot contain more than 5 members.', 1;

    IF EXISTS (
        SELECT tm.user_role_id, tr.event_id
        FROM TeamMember tm
        JOIN Team t ON t.team_id = tm.team_id
        JOIN Track tr ON tr.track_id = t.track_id
        JOIN (SELECT DISTINCT user_role_id FROM inserted) changed ON changed.user_role_id = tm.user_role_id
        GROUP BY tm.user_role_id, tr.event_id
        HAVING COUNT(*) > 1
    )
        THROW 50002, 'A student can belong to only one team in the same event.', 1;
END;
GO

CREATE OR ALTER TRIGGER TR_Submission_ValidateTeamSize
ON Submission
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        WHERE (
            SELECT COUNT(*)
            FROM TeamMember tm
            WHERE tm.team_id = i.team_id
        ) NOT BETWEEN 3 AND 5
    )
        THROW 50003, 'A submission requires a valid team with 3 to 5 members.', 1;
END;
GO

IF OBJECT_ID('TeamInvitation', 'U') IS NULL
BEGIN
    CREATE TABLE TeamInvitation (
        invitation_id INT IDENTITY(1,1) PRIMARY KEY,
        team_id INT NOT NULL,
        invitee_user_role_id INT NOT NULL,
        invited_by_user_role_id INT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        created_at DATETIME DEFAULT GETDATE(),
        responded_at DATETIME NULL,
        CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Cancelled')),
        FOREIGN KEY (team_id) REFERENCES Team(team_id) ON DELETE CASCADE,
        FOREIGN KEY (invitee_user_role_id) REFERENCES StudentProfile(user_role_id) ON DELETE NO ACTION,
        FOREIGN KEY (invited_by_user_role_id) REFERENCES StudentProfile(user_role_id) ON DELETE NO ACTION
    );
END
GO
