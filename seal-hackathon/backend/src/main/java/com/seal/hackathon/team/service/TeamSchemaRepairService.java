package com.seal.hackathon.team.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class TeamSchemaRepairService {

    public TeamSchemaRepairService(JdbcTemplate jdbcTemplate) {
        jdbcTemplate.execute("""
                IF EXISTS (
                    SELECT 1
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = 'Team'
                      AND COLUMN_NAME = 'track_id'
                      AND IS_NULLABLE = 'NO'
                )
                BEGIN
                    ALTER TABLE Team ALTER COLUMN track_id INT NULL;
                END
                """);
        jdbcTemplate.execute("""
                IF COL_LENGTH('HackathonEvent', 'min_team_size') IS NULL
                BEGIN
                    ALTER TABLE HackathonEvent ADD min_team_size INT NULL;
                END
                IF COL_LENGTH('HackathonEvent', 'max_team_size') IS NULL
                BEGIN
                    ALTER TABLE HackathonEvent ADD max_team_size INT NULL;
                END
                IF COL_LENGTH('Track', 'min_teams') IS NULL
                BEGIN
                    ALTER TABLE Track ADD min_teams INT NULL;
                END
                IF COL_LENGTH('Track', 'max_teams') IS NULL
                BEGIN
                    ALTER TABLE Track ADD max_teams INT NULL;
                END
                IF COL_LENGTH('Team', 'accept_auto_assigned_members') IS NULL
                BEGIN
                    ALTER TABLE Team ADD accept_auto_assigned_members BIT NULL;
                END
                IF COL_LENGTH('TeamInvitation', 'invitation_type') IS NULL
                BEGIN
                    ALTER TABLE TeamInvitation ADD invitation_type VARCHAR(50) NULL;
                END
                UPDATE Team
                SET accept_auto_assigned_members = 0
                WHERE accept_auto_assigned_members IS NULL;
                UPDATE TeamInvitation
                SET invitation_type = 'MEMBER_INVITE'
                WHERE invitation_type IS NULL;
                """);
        jdbcTemplate.execute("""
                IF OBJECT_ID('IndividualRegistration', 'U') IS NULL
                BEGIN
                    CREATE TABLE IndividualRegistration (
                        individual_registration_id INT IDENTITY(1,1) PRIMARY KEY,
                        event_id INT NOT NULL,
                        user_role_id INT NOT NULL,
                        preferred_track_id INT NULL,
                        assigned_team_id INT NULL,
                        suggested_track_id INT NULL,
                        status VARCHAR(30) NOT NULL CONSTRAINT DF_IndividualRegistration_Status DEFAULT 'Waiting',
                        status_reason VARCHAR(1000) NULL,
                        created_at DATETIME2 NOT NULL CONSTRAINT DF_IndividualRegistration_CreatedAt DEFAULT SYSUTCDATETIME(),
                        matched_at DATETIME2 NULL,
                        response_due_at DATETIME2 NULL,
                        responded_at DATETIME2 NULL,
                        CONSTRAINT FK_IndividualRegistration_Event FOREIGN KEY (event_id) REFERENCES HackathonEvent(event_id),
                        CONSTRAINT FK_IndividualRegistration_Student FOREIGN KEY (user_role_id) REFERENCES StudentProfile(user_role_id),
                        CONSTRAINT FK_IndividualRegistration_PreferredTrack FOREIGN KEY (preferred_track_id) REFERENCES Track(track_id),
                        CONSTRAINT FK_IndividualRegistration_SuggestedTrack FOREIGN KEY (suggested_track_id) REFERENCES Track(track_id),
                        CONSTRAINT FK_IndividualRegistration_Team FOREIGN KEY (assigned_team_id) REFERENCES Team(team_id)
                    );
                END
                IF COL_LENGTH('IndividualRegistration', 'preferred_track_id') IS NULL
                BEGIN
                    ALTER TABLE IndividualRegistration ADD preferred_track_id INT NULL;
                END
                IF COL_LENGTH('IndividualRegistration', 'suggested_track_id') IS NULL
                BEGIN
                    ALTER TABLE IndividualRegistration ADD suggested_track_id INT NULL;
                END
                IF COL_LENGTH('IndividualRegistration', 'status_reason') IS NULL
                BEGIN
                    ALTER TABLE IndividualRegistration ADD status_reason VARCHAR(1000) NULL;
                END
                IF COL_LENGTH('IndividualRegistration', 'response_due_at') IS NULL
                BEGIN
                    ALTER TABLE IndividualRegistration ADD response_due_at DATETIME2 NULL;
                END
                IF COL_LENGTH('IndividualRegistration', 'responded_at') IS NULL
                BEGIN
                    ALTER TABLE IndividualRegistration ADD responded_at DATETIME2 NULL;
                END
                IF NOT EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_IndividualRegistration_PreferredTrack'
                )
                BEGIN
                    ALTER TABLE IndividualRegistration
                    ADD CONSTRAINT FK_IndividualRegistration_PreferredTrack
                    FOREIGN KEY (preferred_track_id) REFERENCES Track(track_id);
                END
                IF NOT EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_IndividualRegistration_SuggestedTrack'
                )
                BEGIN
                    ALTER TABLE IndividualRegistration
                    ADD CONSTRAINT FK_IndividualRegistration_SuggestedTrack
                    FOREIGN KEY (suggested_track_id) REFERENCES Track(track_id);
                END
                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'UX_IndividualRegistration_Event_Student'
                      AND object_id = OBJECT_ID('IndividualRegistration')
                )
                BEGIN
                    CREATE UNIQUE INDEX UX_IndividualRegistration_Event_Student
                    ON IndividualRegistration(event_id, user_role_id);
                END
                """);
    }
}
