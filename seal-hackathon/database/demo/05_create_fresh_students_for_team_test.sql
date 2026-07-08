USE SEAL_Hackathon_G06;
GO

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;

IF NOT EXISTS (
    SELECT 1
    FROM [Users]
    WHERE username = 'minh.student'
       OR email = 'minh.seal.demo@gmail.com'
)
BEGIN
    INSERT INTO [Users] (
        username,
        email,
        password_hash,
        full_name,
        avatar_url,
        bio,
        status,
        is_approved
    )
    VALUES (
        'minh.student',
        'minh.seal.demo@gmail.com',
        '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu',
        N'Minh Le',
        NULL,
        N'Fresh student account kept unused in seed data for clean team-formation testing.',
        'Active',
        1
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM [Users]
    WHERE username = 'dat.student'
       OR email = 'dat.seal.demo@gmail.com'
)
BEGIN
    INSERT INTO [Users] (
        username,
        email,
        password_hash,
        full_name,
        avatar_url,
        bio,
        status,
        is_approved
    )
    VALUES (
        'dat.student',
        'dat.seal.demo@gmail.com',
        '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu',
        N'Dat Nguyen',
        NULL,
        N'Fresh student account kept unused in seed data for clean team-formation testing.',
        'Active',
        1
    );
END;

DECLARE @MinhUserId INT = (
    SELECT TOP 1 user_id
    FROM [Users]
    WHERE username = 'minh.student'
    ORDER BY user_id DESC
);

DECLARE @DatUserId INT = (
    SELECT TOP 1 user_id
    FROM [Users]
    WHERE username = 'dat.student'
    ORDER BY user_id DESC
);

DECLARE @MinhUserRoleId INT = (
    SELECT TOP 1 user_role_id
    FROM UserRole
    WHERE user_id = @MinhUserId
      AND role_type = 'Student'
    ORDER BY user_role_id DESC
);

DECLARE @DatUserRoleId INT = (
    SELECT TOP 1 user_role_id
    FROM UserRole
    WHERE user_id = @DatUserId
      AND role_type = 'Student'
    ORDER BY user_role_id DESC
);

IF @MinhUserRoleId IS NULL
BEGIN
    INSERT INTO UserRole (user_id, role_type)
    VALUES (@MinhUserId, 'Student');

    SET @MinhUserRoleId = SCOPE_IDENTITY();
END;

IF @DatUserRoleId IS NULL
BEGIN
    INSERT INTO UserRole (user_id, role_type)
    VALUES (@DatUserId, 'Student');

    SET @DatUserRoleId = SCOPE_IDENTITY();
END;

IF NOT EXISTS (
    SELECT 1
    FROM StudentProfile
    WHERE user_role_id = @MinhUserRoleId
)
BEGIN
    INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
    VALUES (@MinhUserRoleId, 'FPT', 'SE181007', N'FPT University HCMC');
END;

IF NOT EXISTS (
    SELECT 1
    FROM StudentProfile
    WHERE user_role_id = @DatUserRoleId
)
BEGIN
    INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
    VALUES (@DatUserRoleId, 'FPT', 'SE181008', N'FPT University HCMC');
END;

SELECT
    u.user_id,
    u.username,
    u.email,
    u.full_name,
    u.status,
    ur.user_role_id,
    ur.role_type,
    sp.student_type,
    sp.student_code,
    sp.university_name
FROM [Users] u
JOIN UserRole ur ON ur.user_id = u.user_id
LEFT JOIN StudentProfile sp ON sp.user_role_id = ur.user_role_id
WHERE u.username IN ('minh.student', 'dat.student')
ORDER BY u.username;
GO
