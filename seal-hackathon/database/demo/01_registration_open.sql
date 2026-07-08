USE SEAL_Hackathon_G06;
GO

SET NOCOUNT ON;

DECLARE @EventId INT = (
    SELECT TOP 1 event_id
    FROM HackathonEvent
    WHERE name = N'SEAL Summer 2026'
    ORDER BY event_id DESC
);

IF @EventId IS NULL
    THROW 51001, 'SEAL Summer 2026 was not found. Run seed_test_data.sql first.', 1;

DECLARE @Now DATETIME = GETDATE();

UPDATE HackathonEvent
SET status = 'Ongoing',
    published_at = COALESCE(published_at, @Now),
    registration_start_at = DATEADD(DAY, -1, @Now),
    registration_end_at = DATEADD(DAY, 5, @Now),
    competition_start_at = DATEADD(DAY, -1, @Now),
    competition_end_at = DATEADD(DAY, 20, @Now)
WHERE event_id = @EventId;

UPDATE [Round]
SET start_at = CASE
        WHEN is_final = 1 THEN DATEADD(DAY, 10, @Now)
        ELSE DATEADD(HOUR, -6, @Now)
    END,
    end_at = CASE
        WHEN is_final = 1 THEN DATEADD(DAY, 13, @Now)
        ELSE DATEADD(DAY, 6, @Now)
    END,
    submission_deadline = CASE
        WHEN is_final = 1 THEN DATEADD(DAY, 12, @Now)
        ELSE DATEADD(DAY, 3, @Now)
    END,
    score_locked = 0
WHERE event_id = @EventId;

SELECT
    e.name,
    e.status,
    e.registration_start_at,
    e.registration_end_at,
    e.competition_start_at,
    e.competition_end_at
FROM HackathonEvent e
WHERE e.event_id = @EventId;

SELECT
    r.round_name,
    r.round_order,
    r.submission_deadline,
    r.score_locked
FROM [Round] r
WHERE r.event_id = @EventId
ORDER BY r.round_order, r.round_id;
GO
