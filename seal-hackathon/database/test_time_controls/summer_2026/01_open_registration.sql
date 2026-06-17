USE SEAL_Hackathon_G06;
GO

DECLARE @event_id INT = (
    SELECT TOP 1 event_id
    FROM HackathonEvent
    WHERE name = N'SEAL Summer 2026'
    ORDER BY event_id DESC
);

IF @event_id IS NULL
BEGIN
    THROW 50001, 'SEAL Summer 2026 was not found. Run seed_test_data.sql first.', 1;
END
GO

DECLARE @event_id INT = (
    SELECT TOP 1 event_id
    FROM HackathonEvent
    WHERE name = N'SEAL Summer 2026'
    ORDER BY event_id DESC
);

UPDATE HackathonEvent
SET
    registration_start_at = '2026-06-10T08:00:00',
    registration_end_at   = '2026-06-25T23:59:00',
    competition_start_at  = '2026-06-28T08:00:00',
    competition_end_at    = '2026-07-25T18:00:00',
    start_date            = '2026-06-28',
    end_date              = '2026-07-25',
    status                = 'Ongoing',
    published_at          = ISNULL(published_at, GETDATE())
WHERE event_id = @event_id;

UPDATE Round
SET
    start_at = CASE
        WHEN round_name = N'Elimination' THEN '2026-06-28T08:00:00'
        WHEN round_name = N'Finals' THEN '2026-07-15T08:00:00'
        ELSE start_at
    END,
    submission_deadline = CASE
        WHEN round_name = N'Elimination' THEN '2026-07-05T23:59:00'
        WHEN round_name = N'Finals' THEN '2026-07-18T23:59:00'
        ELSE submission_deadline
    END,
    end_at = CASE
        WHEN round_name = N'Elimination' THEN '2026-07-08T23:59:00'
        WHEN round_name = N'Finals' THEN '2026-07-20T23:59:00'
        ELSE end_at
    END
WHERE event_id = @event_id;

SELECT
    name,
    registration_start_at,
    registration_end_at,
    competition_start_at,
    competition_end_at,
    status
FROM HackathonEvent
WHERE event_id = @event_id;

SELECT
    round_name,
    start_at,
    submission_deadline,
    end_at
FROM Round
WHERE event_id = @event_id
ORDER BY round_order;
GO
