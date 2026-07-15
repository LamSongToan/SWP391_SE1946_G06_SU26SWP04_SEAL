USE SEAL_Hackathon_G06;
GO

SET NOCOUNT ON;

DECLARE @ScenarioKey NVARCHAR(120) = N'registration_closed';
DECLARE @ScenarioTitle NVARCHAR(180) = N'Registration closed';
DECLARE @ScenarioDescription NVARCHAR(500) = N'Lifecycle demo: Summer 2026 registration is closed, the qualifier has not opened yet, and there are still no submissions.';
DECLARE @ScenarioNow DATETIME2 = '2026-07-15T09:00:00';
DECLARE @PublishedAt DATETIME2 = '2026-07-03T09:00:00';
DECLARE @RegistrationStart DATETIME2 = '2026-07-05T09:00:00';
DECLARE @RegistrationEnd DATETIME2 = '2026-07-14T09:00:00';
DECLARE @CompetitionStart DATETIME2 = '2026-07-16T09:00:00';
DECLARE @CompetitionEnd DATETIME2 = '2026-08-12T09:00:00';
DECLARE @QualifierStart DATETIME2 = '2026-07-16T09:00:00';
DECLARE @QualifierDeadline DATETIME2 = '2026-07-21T09:00:00';
DECLARE @QualifierEnd DATETIME2 = '2026-07-23T09:00:00';
DECLARE @FinalStart DATETIME2 = '2026-08-02T09:00:00';
DECLARE @FinalDeadline DATETIME2 = '2026-08-06T09:00:00';
DECLARE @FinalEnd DATETIME2 = '2026-08-08T09:00:00';

DECLARE @EventId INT = (
    SELECT TOP 1 event_id
    FROM HackathonEvent
    WHERE name = N'SEAL Summer 2026'
    ORDER BY event_id DESC
);

IF @EventId IS NULL
    THROW 51001, 'SEAL Summer 2026 was not found. Run seed_test_data.sql first.', 1;

DECLARE @WebTrackId INT = (
    SELECT TOP 1 track_id
    FROM Track
    WHERE event_id = @EventId
      AND name = N'Web Platform'
    ORDER BY track_id
);
DECLARE @AiTrackId INT = (
    SELECT TOP 1 track_id
    FROM Track
    WHERE event_id = @EventId
      AND name = N'AI & Data'
    ORDER BY track_id
);
DECLARE @QualifierRoundId INT = (
    SELECT TOP 1 round_id
    FROM [Round]
    WHERE event_id = @EventId
      AND is_final = 0
    ORDER BY round_order, round_id
);
DECLARE @FinalRoundId INT = (
    SELECT TOP 1 round_id
    FROM [Round]
    WHERE event_id = @EventId
      AND is_final = 1
    ORDER BY round_order, round_id
);

IF @WebTrackId IS NULL OR @AiTrackId IS NULL OR @QualifierRoundId IS NULL OR @FinalRoundId IS NULL
    THROW 51002, 'Summer 2026 core tracks/rounds are incomplete. Re-run seed_test_data.sql first.', 1;

UPDATE HackathonEvent
SET start_date = CAST(@CompetitionStart AS DATE),
    end_date = CAST(@CompetitionEnd AS DATE),
    registration_start_at = @RegistrationStart,
    registration_end_at = @RegistrationEnd,
    competition_start_at = @CompetitionStart,
    competition_end_at = @CompetitionEnd,
    track_selection_mode = 'TEAM_SELECT',
    min_team_size = 3,
    max_team_size = 5,
    ranking_method = 'FINAL_SCORE',
    awards_json = N'[{"awardName":"Champion","quantity":1,"prizeAmountVnd":20000000},{"awardName":"Runner-up","quantity":1,"prizeAmountVnd":10000000}]',
    published_at = @PublishedAt,
    status = 'Ongoing',
    description = @ScenarioDescription
WHERE event_id = @EventId;

UPDATE Track
SET min_teams = 8,
    max_teams = 10
WHERE track_id IN (@WebTrackId, @AiTrackId);

UPDATE [Round]
SET round_name = N'Elimination',
    round_order = 1,
    start_at = @QualifierStart,
    end_at = @QualifierEnd,
    submission_deadline = @QualifierDeadline,
    promotion_rule_top_n = 2,
    is_final = 0,
    score_locked = 0
WHERE round_id = @QualifierRoundId;

UPDATE [Round]
SET round_name = N'Finals',
    round_order = 2,
    start_at = @FinalStart,
    end_at = @FinalEnd,
    submission_deadline = @FinalDeadline,
    promotion_rule_top_n = NULL,
    is_final = 1,
    score_locked = 0
WHERE round_id = @FinalRoundId;

IF OBJECT_ID('dbo.EventUpdateNotification', 'U') IS NOT NULL
BEGIN
    DELETE FROM dbo.EventUpdateNotification
    WHERE event_id = @EventId
      AND announcement_audience IN (
            'SYSTEM_TRACK_REVIEW_REMINDER_2D',
            'SYSTEM_TRACK_REVIEW_REMINDER_1D',
            'SYSTEM_EVENT_STARTED',
            'SYSTEM_EVENT_AUTO_CANCELLED'
      );
END;

PRINT N'Lifecycle transition applied: registration is now closed for SEAL Summer 2026.';
PRINT N'Existing teams, team members, invitations, individual registrations, submissions, scores, and awards were preserved.';
GO
