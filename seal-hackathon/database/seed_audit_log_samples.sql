USE SEAL_Hackathon_G06;
GO

-- =======================================================
-- Sample Audit Logs for UI/demo verification
-- Run after base schema and seed_test_data.sql.
-- This script is idempotent for the sample reasons below.
-- =======================================================

DECLARE @ActorUserId INT;
DECLARE @EventId INT;
DECLARE @EventName NVARCHAR(150);
DECLARE @TrackId INT;
DECLARE @TrackName NVARCHAR(100);
DECLARE @RoundId INT;
DECLARE @RoundName NVARCHAR(100);
DECLARE @TeamId INT;
DECLARE @TeamName NVARCHAR(100);
DECLARE @SubmissionId INT;

SELECT TOP 1 @ActorUserId = u.user_id
FROM [Users] u
JOIN UserRole ur ON ur.user_id = u.user_id
WHERE ur.role_type = 'Coordinator'
ORDER BY CASE WHEN u.username = 'toan.coordinator' THEN 0 ELSE 1 END, u.user_id;

IF @ActorUserId IS NULL
BEGIN
    SELECT TOP 1 @ActorUserId = user_id
    FROM [Users]
    ORDER BY user_id;
END

SELECT TOP 1
    @EventId = event_id,
    @EventName = name
FROM HackathonEvent
ORDER BY event_id;

SELECT TOP 1
    @TrackId = track_id,
    @TrackName = name
FROM Track
WHERE @EventId IS NULL OR event_id = @EventId
ORDER BY track_id;

SELECT TOP 1
    @RoundId = round_id,
    @RoundName = round_name
FROM [Round]
WHERE @EventId IS NULL OR event_id = @EventId
ORDER BY round_order, round_id;

SELECT TOP 1
    @TeamId = team_id,
    @TeamName = team_name
FROM Team
WHERE @TrackId IS NULL OR track_id = @TrackId
ORDER BY team_id;

SELECT TOP 1
    @SubmissionId = submission_id
FROM Submission
WHERE (@TeamId IS NULL OR team_id = @TeamId)
   OR (@RoundId IS NULL OR round_id = @RoundId)
ORDER BY submission_id;

IF @ActorUserId IS NULL
BEGIN
    THROW 51001, 'Cannot seed AuditLog samples because there is no user in [Users]. Run user seed data first.', 1;
END

IF NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: event update')
BEGIN
    INSERT INTO AuditLog (
        user_id,
        action_type,
        target_entity,
        target_id,
        target_name,
        old_value,
        new_value,
        reason,
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @ActorUserId,
        'EVENT_UPDATED',
        'EVENT',
        @EventId,
        COALESCE(@EventName, N'Sample Event'),
        N'{"status":"Draft","trackSelectionMode":"Teams choose their track"}',
        N'{"status":"Ongoing","trackSelectionMode":"Coordinator assigns tracks"}',
        N'Sample audit log seed: event update',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -55, GETDATE())
    );
END

IF @TrackId IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: track update')
BEGIN
    INSERT INTO AuditLog (
        user_id,
        action_type,
        target_entity,
        target_id,
        target_name,
        old_value,
        new_value,
        reason,
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @ActorUserId,
        'TRACK_UPDATED',
        'TRACK',
        @TrackId,
        @TrackName,
        N'{"name":"Web Platform","minTeams":2,"maxTeams":8}',
        N'{"name":"Web Platform","minTeams":3,"maxTeams":10}',
        N'Sample audit log seed: track update',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -42, GETDATE())
    );
END

IF @RoundId IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: round update')
BEGIN
    INSERT INTO AuditLog (
        user_id,
        action_type,
        target_entity,
        target_id,
        target_name,
        old_value,
        new_value,
        reason,
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @ActorUserId,
        'ROUND_UPDATED',
        'ROUND',
        @RoundId,
        @RoundName,
        N'{"roundName":"Elimination","promotionRuleTopN":2,"scoreLocked":false}',
        N'{"roundName":"Elimination","promotionRuleTopN":3,"scoreLocked":false}',
        N'Sample audit log seed: round update',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -31, GETDATE())
    );
END

IF @TeamId IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: team registration')
BEGIN
    INSERT INTO AuditLog (
        user_id,
        action_type,
        target_entity,
        target_id,
        target_name,
        old_value,
        new_value,
        reason,
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @ActorUserId,
        'TEAM_REGISTERED_FOR_EVENT',
        'TEAM',
        @TeamId,
        @TeamName,
        NULL,
        N'{"status":"Forming","membershipValid":true,"trackAssigned":true}',
        N'Sample audit log seed: team registration',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -24, GETDATE())
    );
END

IF @SubmissionId IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: submission update')
BEGIN
    INSERT INTO AuditLog (
        user_id,
        action_type,
        target_entity,
        target_id,
        target_name,
        old_value,
        new_value,
        reason,
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @ActorUserId,
        'SUBMISSION_UPDATED',
        'SUBMISSION',
        @SubmissionId,
        COALESCE(@TeamName, N'Sample Submission'),
        N'{"repositoryUrl":"https://github.com/demo/old-repo","status":"Submitted"}',
        N'{"repositoryUrl":"https://github.com/demo/new-repo","status":"Evaluating"}',
        N'Sample audit log seed: submission update',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -12, GETDATE())
    );
END

IF NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: account approval')
BEGIN
    INSERT INTO AuditLog (
        user_id,
        action_type,
        target_entity,
        target_id,
        target_name,
        old_value,
        new_value,
        reason,
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @ActorUserId,
        'ACCOUNT_APPROVED',
        'USER',
        @ActorUserId,
        N'Toan Tran',
        N'{"status":"PendingApproval","approved":false}',
        N'{"status":"Active","approved":true}',
        N'Sample audit log seed: account approval',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -5, GETDATE())
    );
END

IF @EventId IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: announcement sent')
BEGIN
    INSERT INTO AuditLog (
        user_id,
        action_type,
        target_entity,
        target_id,
        target_name,
        old_value,
        new_value,
        reason,
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @ActorUserId,
        'ANNOUNCEMENT_SENT',
        'EVENT',
        @EventId,
        @EventName,
        NULL,
        N'{"title":"Registration reminder","message":"Please complete team registration before the deadline.","audience":"ALL","recipientCount":12}',
        N'Sample audit log seed: announcement sent',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -2, GETDATE())
    );
END

SELECT
    COUNT(*) AS sample_audit_logs
FROM AuditLog
WHERE reason LIKE N'Sample audit log seed:%';
GO
