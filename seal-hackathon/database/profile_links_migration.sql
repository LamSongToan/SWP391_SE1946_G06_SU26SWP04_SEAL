IF COL_LENGTH('dbo.Users', 'profile_links') IS NULL
BEGIN
    ALTER TABLE dbo.[Users] ADD profile_links NVARCHAR(2000) NULL;
END
