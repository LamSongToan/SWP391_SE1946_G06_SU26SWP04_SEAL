USE SEAL_Hackathon_G06;
GO

-- Approve account for login testing in Sprint 1
-- Replace email as needed
UPDATE [Users]
SET status = 'Active',
    is_approved = 1
WHERE email = 'an@fpt.edu.vn';
GO

-- Verify current users
SELECT user_id, email, full_name, status, is_approved, created_at
FROM [Users]
ORDER BY user_id DESC;
GO
