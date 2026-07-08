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
    WHERE username = 'huy.student'
       OR email = 'huy.seal.demo@gmail.com'
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
        'huy.student',
        'huy.seal.demo@gmail.com',
        '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu',
        N'Huy Pham',
        NULL,
        N'Fresh student account kept unused in seed data for clean registration and team-flow testing.',
        'Active',
        1
    );
END;

DECLARE @UserId INT = (
    SELECT TOP 1 user_id
    FROM [Users]
    WHERE username = 'huy.student'
    ORDER BY user_id DESC
);

DECLARE @UserRoleId INT = (
    SELECT TOP 1 user_role_id
    FROM UserRole
    WHERE user_id = @UserId
      AND role_type = 'Student'
    ORDER BY user_role_id DESC
);

IF @UserRoleId IS NULL
BEGIN
    INSERT INTO UserRole (user_id, role_type)
    VALUES (@UserId, 'Student');

    SET @UserRoleId = SCOPE_IDENTITY();
END;

IF NOT EXISTS (
    SELECT 1
    FROM StudentProfile
    WHERE user_role_id = @UserRoleId
)
BEGIN
    INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
    VALUES (@UserRoleId, 'FPT', 'SE181006', N'FPT University HCMC');
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
WHERE u.username = 'huy.student';
GO
