package com.seal.hackathon.event.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class EventSchemaRepairService {

    public EventSchemaRepairService(JdbcTemplate jdbcTemplate) {
        jdbcTemplate.execute("""
                IF OBJECT_ID('dbo.Announcement', 'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.Announcement (
                        announcement_id INT IDENTITY(1,1) PRIMARY KEY,
                        event_id INT NOT NULL,
                        event_name NVARCHAR(150) NOT NULL,
                        title NVARCHAR(180) NOT NULL,
                        message NVARCHAR(1000) NOT NULL,
                        audience VARCHAR(64) NOT NULL,
                        recipient_count INT NOT NULL CONSTRAINT DF_Announcement_RecipientCount DEFAULT 0,
                        created_by_user_id INT NOT NULL,
                        created_at DATETIME2 NOT NULL CONSTRAINT DF_Announcement_CreatedAt DEFAULT SYSUTCDATETIME(),
                        updated_at DATETIME2 NULL,
                        CONSTRAINT FK_Announcement_CreatedBy
                            FOREIGN KEY (created_by_user_id) REFERENCES dbo.[Users](user_id)
                    );
                END;

                IF OBJECT_ID('dbo.EventUpdateNotification', 'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.EventUpdateNotification (
                        notification_id INT IDENTITY(1,1) PRIMARY KEY,
                        announcement_id INT NULL,
                        user_id INT NOT NULL,
                        event_id INT NOT NULL,
                        event_name NVARCHAR(150) NOT NULL,
                        title NVARCHAR(180) NOT NULL,
                        message NVARCHAR(1000) NOT NULL,
                        announcement_audience VARCHAR(64) NULL,
                        is_read BIT NOT NULL CONSTRAINT DF_EventUpdateNotification_IsRead DEFAULT 0,
                        read_at DATETIME2 NULL,
                        created_at DATETIME2 NOT NULL CONSTRAINT DF_EventUpdateNotification_CreatedAt DEFAULT SYSUTCDATETIME(),
                        CONSTRAINT FK_EventUpdateNotification_User
                            FOREIGN KEY (user_id) REFERENCES dbo.[Users](user_id),
                        CONSTRAINT FK_EventUpdateNotification_Announcement
                            FOREIGN KEY (announcement_id) REFERENCES dbo.Announcement(announcement_id)
                    );
                END;

                IF OBJECT_ID('dbo.EventUpdateNotification', 'U') IS NOT NULL
                BEGIN
                    IF COL_LENGTH('dbo.EventUpdateNotification', 'announcement_id') IS NULL
                    BEGIN
                        ALTER TABLE dbo.EventUpdateNotification ADD announcement_id INT NULL;
                    END;

                    IF COL_LENGTH('dbo.EventUpdateNotification', 'is_read') IS NULL
                    BEGIN
                        ALTER TABLE dbo.EventUpdateNotification
                        ADD is_read BIT NOT NULL CONSTRAINT DF_EventUpdateNotification_IsRead DEFAULT 0;
                    END;

                    IF COL_LENGTH('dbo.EventUpdateNotification', 'read_at') IS NULL
                    BEGIN
                        ALTER TABLE dbo.EventUpdateNotification ADD read_at DATETIME2 NULL;
                    END;

                    IF EXISTS (
                        SELECT 1
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_SCHEMA = 'dbo'
                          AND TABLE_NAME = 'EventUpdateNotification'
                          AND COLUMN_NAME = 'event_name'
                          AND DATA_TYPE <> 'nvarchar'
                    )
                    BEGIN
                        ALTER TABLE dbo.EventUpdateNotification ALTER COLUMN event_name NVARCHAR(150) NOT NULL;
                    END;

                    IF EXISTS (
                        SELECT 1
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_SCHEMA = 'dbo'
                          AND TABLE_NAME = 'EventUpdateNotification'
                          AND COLUMN_NAME = 'title'
                          AND DATA_TYPE <> 'nvarchar'
                    )
                    BEGIN
                        ALTER TABLE dbo.EventUpdateNotification ALTER COLUMN title NVARCHAR(180) NOT NULL;
                    END;

                    IF EXISTS (
                        SELECT 1
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_SCHEMA = 'dbo'
                          AND TABLE_NAME = 'EventUpdateNotification'
                          AND COLUMN_NAME = 'message'
                          AND DATA_TYPE <> 'nvarchar'
                    )
                    BEGIN
                        ALTER TABLE dbo.EventUpdateNotification ALTER COLUMN message NVARCHAR(1000) NOT NULL;
                    END;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM sys.foreign_keys
                        WHERE name = 'FK_EventUpdateNotification_Announcement'
                    )
                    BEGIN
                        ALTER TABLE dbo.EventUpdateNotification WITH CHECK
                        ADD CONSTRAINT FK_EventUpdateNotification_Announcement
                        FOREIGN KEY (announcement_id) REFERENCES dbo.Announcement(announcement_id);
                    END;
                END;

                IF OBJECT_ID('dbo.Announcement', 'U') IS NOT NULL
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_SCHEMA = 'dbo'
                          AND TABLE_NAME = 'Announcement'
                          AND COLUMN_NAME = 'audience'
                          AND (
                                DATA_TYPE <> 'varchar'
                                OR CHARACTER_MAXIMUM_LENGTH IS NULL
                                OR CHARACTER_MAXIMUM_LENGTH < 64
                          )
                    )
                    BEGIN
                        ALTER TABLE dbo.Announcement ALTER COLUMN audience VARCHAR(64) NOT NULL;
                    END;
                END;

                IF OBJECT_ID('dbo.EventUpdateNotification', 'U') IS NOT NULL
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_SCHEMA = 'dbo'
                          AND TABLE_NAME = 'EventUpdateNotification'
                          AND COLUMN_NAME = 'announcement_audience'
                          AND (
                                DATA_TYPE <> 'varchar'
                                OR CHARACTER_MAXIMUM_LENGTH IS NULL
                                OR CHARACTER_MAXIMUM_LENGTH < 64
                          )
                    )
                    BEGIN
                        ALTER TABLE dbo.EventUpdateNotification ALTER COLUMN announcement_audience VARCHAR(64) NULL;
                    END;
                END;

                IF OBJECT_ID('dbo.Round', 'U') IS NOT NULL
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM sys.columns
                        WHERE object_id = OBJECT_ID('dbo.Round')
                          AND name = 'promotion_rule_top_n'
                          AND is_nullable = 0
                    )
                    BEGIN
                        ALTER TABLE dbo.Round ALTER COLUMN promotion_rule_top_n INT NULL;
                    END;

                    IF EXISTS (
                        SELECT 1
                        FROM sys.columns
                        WHERE object_id = OBJECT_ID('dbo.Round')
                          AND name = 'submission_deadline'
                          AND is_nullable = 0
                    )
                    BEGIN
                        ALTER TABLE dbo.Round ALTER COLUMN submission_deadline DATETIME2 NULL;
                    END;
                END;

                IF OBJECT_ID('dbo.RoundTrackPromotionRule', 'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.RoundTrackPromotionRule (
                        promotion_rule_id INT IDENTITY(1,1) PRIMARY KEY,
                        round_id INT NOT NULL,
                        track_id INT NOT NULL,
                        top_n INT NOT NULL,
                        CONSTRAINT CK_RoundTrackPromotionRule_TopN CHECK (top_n >= 1),
                        CONSTRAINT UQ_RoundTrackPromotionRule_Round_Track UNIQUE (round_id, track_id),
                        CONSTRAINT FK_RoundTrackPromotionRule_Round
                            FOREIGN KEY (round_id) REFERENCES dbo.Round(round_id) ON DELETE CASCADE,
                        CONSTRAINT FK_RoundTrackPromotionRule_Track
                            FOREIGN KEY (track_id) REFERENCES dbo.Track(track_id)
                    );
                END;

                INSERT INTO dbo.RoundTrackPromotionRule (round_id, track_id, top_n)
                SELECT r.round_id, t.track_id, r.promotion_rule_top_n
                FROM dbo.Round r
                JOIN dbo.Track t ON t.event_id = r.event_id
                WHERE r.is_final = 0
                  AND r.promotion_rule_top_n IS NOT NULL
                  AND r.promotion_rule_top_n >= 1
                  AND NOT EXISTS (
                      SELECT 1
                      FROM dbo.RoundTrackPromotionRule promotion_rule
                      WHERE promotion_rule.round_id = r.round_id
                        AND promotion_rule.track_id = t.track_id
                  );
                """);
    }
}
