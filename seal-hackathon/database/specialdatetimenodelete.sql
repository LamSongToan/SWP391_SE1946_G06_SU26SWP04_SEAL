USE SEAL_Hackathon_G06;
GO

-- =========================
-- 1. Event: Registration DONE
-- =========================
UPDATE HackathonEvent
SET
    registration_start_at = '2026-06-10T08:00:00',
    registration_end_at   = '2026-06-17T23:59:00',
    competition_start_at  = '2026-06-18T08:00:00',
    competition_end_at    = '2026-07-20T18:00:00',
    status = 'Ongoing',
    published_at = GETDATE()
WHERE name = N'SEAL Summer 2026';
GO

-- =========================
-- 2. Round đang mở submit vào ngày 18/06
-- Team có thể nộp bài, judge chưa nên chấm
-- =========================
UPDATE Round
SET
    start_at = '2026-06-18T08:00:00',
    submission_deadline = '2026-06-20T23:59:00',
    end_at = '2026-06-23T23:59:00'
WHERE event_id = (
    SELECT TOP 1 event_id
    FROM HackathonEvent
    WHERE name = N'SEAL Summer 2026'
)
AND round_name = N'Elimination';
GO

-- =========================
-- 3. Round để giảng viên/judge có thể chấm
-- Deadline submit đã qua, nhưng round chưa end
-- =========================
UPDATE Round
SET
    start_at = '2026-06-10T08:00:00',
    submission_deadline = '2026-06-17T23:59:00',
    end_at = '2026-06-20T23:59:00'
WHERE event_id = (
    SELECT TOP 1 event_id
    FROM HackathonEvent
    WHERE name = N'SEAL Spring 2026'
)
AND round_name = N'Qualifier';
GO

-- =========================
-- 4. Event: Registration CHƯA DONE
-- Để test trạng thái vẫn còn đăng ký
-- =========================
UPDATE HackathonEvent
SET
    registration_start_at = '2026-06-15T08:00:00',
    registration_end_at   = '2026-06-25T23:59:00',
    competition_start_at  = '2026-06-26T08:00:00',
    competition_end_at    = '2026-07-20T18:00:00',
    status = 'Published',
    published_at = GETDATE()
WHERE name = N'SEAL Spring 2026';
GO