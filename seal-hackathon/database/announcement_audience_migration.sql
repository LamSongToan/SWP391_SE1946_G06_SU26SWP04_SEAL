IF OBJECT_ID('dbo.EventUpdateNotification', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EventUpdateNotification (
        notification_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        event_id INT NOT NULL,
        event_name NVARCHAR(150) NOT NULL,
        title NVARCHAR(180) NOT NULL,
        message NVARCHAR(1000) NOT NULL,
        announcement_audience VARCHAR(30) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_EventUpdateNotification_User
            FOREIGN KEY (user_id) REFERENCES dbo.[Users](user_id) ON DELETE CASCADE
    );
END
ELSE IF COL_LENGTH('dbo.EventUpdateNotification', 'announcement_audience') IS NULL
BEGIN
    ALTER TABLE dbo.EventUpdateNotification ADD announcement_audience VARCHAR(30) NULL;
END

IF OBJECT_ID('dbo.EventUpdateNotification', 'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.EventUpdateNotification ALTER COLUMN event_name NVARCHAR(150) NOT NULL;
    ALTER TABLE dbo.EventUpdateNotification ALTER COLUMN title NVARCHAR(180) NOT NULL;
    ALTER TABLE dbo.EventUpdateNotification ALTER COLUMN message NVARCHAR(1000) NOT NULL;
END
