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
DECLARE @EliminationRoundId INT = (
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
DECLARE @TeamId INT = (
    SELECT TOP 1 team_id
    FROM Team
    WHERE team_name = N'SEAL Coders'
    ORDER BY team_id DESC
);
DECLARE @LeaderRoleId INT = (
    SELECT TOP 1 user_role_id
    FROM Team
    WHERE team_id = @TeamId
);
DECLARE @SubmissionId INT = (
    SELECT TOP 1 submission_id
    FROM Submission
    WHERE team_id = @TeamId
      AND round_id = @EliminationRoundId
    ORDER BY submission_id DESC
);

UPDATE HackathonEvent
SET status = 'Ongoing',
    published_at = COALESCE(published_at, @Now),
    registration_start_at = DATEADD(DAY, -14, @Now),
    registration_end_at = DATEADD(DAY, -7, @Now),
    competition_start_at = DATEADD(DAY, -3, @Now),
    competition_end_at = DATEADD(DAY, 10, @Now)
WHERE event_id = @EventId;

UPDATE [Round]
SET start_at = DATEADD(DAY, -2, @Now),
    end_at = DATEADD(DAY, 3, @Now),
    submission_deadline = DATEADD(HOUR, -2, @Now),
    score_locked = 0
WHERE round_id = @EliminationRoundId;

UPDATE [Round]
SET start_at = DATEADD(DAY, 7, @Now),
    end_at = DATEADD(DAY, 10, @Now),
    submission_deadline = DATEADD(DAY, 9, @Now),
    score_locked = 0
WHERE round_id = @FinalRoundId;

IF @SubmissionId IS NOT NULL
BEGIN
    DELETE FROM Feedback WHERE submission_id = @SubmissionId;
    DELETE FROM ScoreHistory WHERE evaluation_id IN (SELECT evaluation_id FROM JudgeEvaluation WHERE submission_id = @SubmissionId);
    DELETE FROM Score WHERE submission_id = @SubmissionId;
    DELETE FROM JudgeEvaluation WHERE submission_id = @SubmissionId;
    DELETE FROM SubmissionHistory WHERE submission_id = @SubmissionId;

    UPDATE Submission
    SET status = 'Evaluating',
        submitted_at = DATEADD(DAY, -1, @Now),
        updated_at = DATEADD(HOUR, -2, @Now),
        submitted_by_user_role_id = @LeaderRoleId
    WHERE submission_id = @SubmissionId;
END
ELSE IF @TeamId IS NOT NULL
BEGIN
    INSERT INTO Submission (
        team_id,
        round_id,
        repository_url,
        demo_url,
        slide_url,
        github_metadata,
        is_calibration,
        status,
        submitted_at,
        updated_at,
        submitted_by_user_role_id
    )
    VALUES (
        @TeamId,
        @EliminationRoundId,
        'https://github.com/seal-demo/seal-coders',
        'https://youtu.be/demo-seal-coders',
        'https://docs.google.com/presentation/d/demo-seal-coders',
        NULL,
        0,
        'Evaluating',
        DATEADD(DAY, -1, @Now),
        DATEADD(HOUR, -2, @Now),
        @LeaderRoleId
    );

    SET @SubmissionId = SCOPE_IDENTITY();
END;

SELECT
    e.name,
    e.status,
    r.round_name,
    r.submission_deadline,
    r.score_locked,
    s.submission_id,
    s.status AS submission_status
FROM HackathonEvent e
JOIN [Round] r ON r.event_id = e.event_id AND r.round_id = @EliminationRoundId
LEFT JOIN Submission s ON s.submission_id = @SubmissionId
WHERE e.event_id = @EventId;
GO
