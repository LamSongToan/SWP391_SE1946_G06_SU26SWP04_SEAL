USE SEAL_Hackathon_G06;
GO

IF COL_LENGTH('Users', 'rejection_reason') IS NULL
BEGIN
    ALTER TABLE [Users]
    ADD rejection_reason NVARCHAR(1000) NULL;
END
GO

ALTER TABLE [Users]
ALTER COLUMN rejection_reason NVARCHAR(1000) NULL;
GO

DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql += N'ALTER TABLE [Users] DROP CONSTRAINT ' + QUOTENAME(cc.name) + N';'
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID(N'[Users]')
  AND cc.definition LIKE '%status%';

EXEC sp_executesql @sql;
GO

UPDATE [Users]
SET status = CASE
    WHEN UPPER(status) IN ('PENDING', 'PENDINGAPPROVAL') THEN 'PendingApproval'
    WHEN UPPER(status) IN ('APPROVED', 'ACTIVE') THEN 'Active'
    WHEN UPPER(status) = 'REJECTED' THEN 'Rejected'
    WHEN UPPER(status) IN ('DISABLED', 'SUSPENDED') THEN 'Suspended'
    ELSE status
END;
GO

ALTER TABLE [Users]
ADD CONSTRAINT CK_Users_Status_BusinessRule
CHECK (status IN ('PendingApproval', 'Active', 'Rejected', 'Suspended'));
GO

DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql += N'ALTER TABLE HackathonEvent DROP CONSTRAINT ' + QUOTENAME(cc.name) + N';'
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID(N'HackathonEvent')
  AND cc.definition LIKE '%status%';

EXEC sp_executesql @sql;
GO

UPDATE HackathonEvent
SET status = CASE
    WHEN UPPER(status) IN ('UPCOMING', 'DRAFT') THEN 'Draft'
    WHEN UPPER(status) IN ('ACTIVE', 'ONGOING', 'CONFIGURED', 'REGISTRATIONOPEN', 'SCORING', 'RESULTPUBLISHED') THEN 'Ongoing'
    WHEN UPPER(status) IN ('CLOSED', 'CANCELLED', 'COMPLETED', 'FINISHED') THEN 'Ended'
    ELSE status
END;
GO

ALTER TABLE HackathonEvent
ADD CONSTRAINT CK_HackathonEvent_Status_BusinessRule
CHECK (status IN ('Draft', 'Ongoing', 'Ended'));
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Track_Event_Name'
)
BEGIN
    ALTER TABLE Track
    ADD CONSTRAINT UQ_Track_Event_Name UNIQUE (event_id, name);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Round_Event_Order'
)
BEGIN
    ALTER TABLE Round
    ADD CONSTRAINT UQ_Round_Event_Order UNIQUE (event_id, round_order);
END
GO
