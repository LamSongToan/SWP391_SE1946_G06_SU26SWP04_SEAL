USE SEAL_Hackathon_G06;
GO

/*
    SEAL Sprint 1 - Account rejection reason migration

    Purpose:
    - Add Users.rejection_reason if it does not exist.
    - Ensure the column uses NVARCHAR so Vietnamese rejection reasons keep accents.
    - Keep existing data whenever possible.

    Important:
    - If old rejection reasons were already stored as VARCHAR and appear as '?' in the UI,
      the original Vietnamese accents are already lost. After running this migration,
      update those records manually with a Unicode string prefixed by N.

    Example manual repair:
      UPDATE [Users]
      SET rejection_reason = N'Ma so sinh vien khong khop voi thong tin dang ky.'
      WHERE email = 'student@example.com';
*/

IF COL_LENGTH('Users', 'rejection_reason') IS NULL
BEGIN
    ALTER TABLE [Users]
    ADD rejection_reason NVARCHAR(1000) NULL;
END
GO

ALTER TABLE [Users]
ALTER COLUMN rejection_reason NVARCHAR(1000) NULL;
GO

PRINT 'Users.rejection_reason is ready as NVARCHAR(1000).';
GO

SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Users'
  AND COLUMN_NAME = 'rejection_reason';
GO

SELECT
    user_id,
    email,
    status,
    rejection_reason
FROM [Users]
WHERE status = 'Rejected'
ORDER BY user_id;
GO
