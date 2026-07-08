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

UPDATE HackathonEvent
SET status = 'Ongoing',
    registration_start_at = '2026-06-10T08:00:00',
    registration_end_at = '2026-06-25T23:59:00',
    competition_start_at = '2026-06-15T08:00:00',
    competition_end_at = '2026-07-20T18:00:00'
WHERE event_id = @EventId;

UPDATE [Round]
SET start_at = '2026-06-20T08:00:00',
    end_at = '2026-06-30T23:59:00',
    submission_deadline = '2026-06-30T23:59:00',
    score_locked = 0
WHERE event_id = @EventId
  AND is_final = 0;

UPDATE [Round]
SET start_at = '2026-07-15T08:00:00',
    end_at = '2026-07-18T23:59:00',
    submission_deadline = '2026-07-18T23:59:00',
    score_locked = 0
WHERE event_id = @EventId
  AND is_final = 1;

SELECT
    e.name,
    e.registration_start_at,
    e.registration_end_at,
    e.competition_start_at,
    e.competition_end_at
FROM HackathonEvent e
WHERE e.event_id = @EventId;

SELECT
    r.round_name,
    r.round_order,
    r.start_at,
    r.end_at,
    r.submission_deadline,
    r.score_locked
FROM [Round] r
WHERE r.event_id = @EventId
ORDER BY r.round_order, r.round_id;
GO
