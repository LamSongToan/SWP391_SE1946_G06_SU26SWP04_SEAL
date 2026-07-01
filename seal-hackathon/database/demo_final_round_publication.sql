SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
SET NOCOUNT ON;

DECLARE @EventId INT = (
    SELECT TOP 1 event_id
    FROM HackathonEvent
    WHERE name = N'SEAL Summer 2026'
    ORDER BY event_id DESC
);

IF @EventId IS NULL
    THROW 51001, 'SEAL Summer 2026 was not found. Run seed_test_data.sql first.', 1;

DECLARE @FinalRoundId INT = (
    SELECT TOP 1 round_id
    FROM Round
    WHERE event_id = @EventId
      AND (is_final = 1 OR round_name = N'Finals')
    ORDER BY is_final DESC, round_order DESC, round_id DESC
);

IF @FinalRoundId IS NULL
    THROW 51002, 'Final round was not found for SEAL Summer 2026.', 1;

DECLARE @Now DATETIME = GETDATE();
DECLARE @WebTrackId INT = (
    SELECT TOP 1 track_id
    FROM Track
    WHERE event_id = @EventId
      AND name = N'Web Platform'
    ORDER BY track_id DESC
);
DECLARE @AiTrackId INT = (
    SELECT TOP 1 track_id
    FROM Track
    WHERE event_id = @EventId
      AND name = N'AI & Data'
    ORDER BY track_id DESC
);

IF @WebTrackId IS NULL OR @AiTrackId IS NULL
    THROW 51003, 'Required Summer 2026 tracks were not found.', 1;

IF NOT EXISTS (
    SELECT 1
    FROM ScoringCriteria
    WHERE round_id = @FinalRoundId
      AND criteria_name = N'Problem-Solution Fit'
)
BEGIN
    INSERT INTO ScoringCriteria (round_id, criteria_name, weight, criteria_type)
    VALUES (@FinalRoundId, N'Problem-Solution Fit', 30.00, 'Technical');
END;

IF NOT EXISTS (
    SELECT 1
    FROM ScoringCriteria
    WHERE round_id = @FinalRoundId
      AND criteria_name = N'Implementation Quality'
)
BEGIN
    INSERT INTO ScoringCriteria (round_id, criteria_name, weight, criteria_type)
    VALUES (@FinalRoundId, N'Implementation Quality', 40.00, 'Technical');
END;

IF NOT EXISTS (
    SELECT 1
    FROM ScoringCriteria
    WHERE round_id = @FinalRoundId
      AND criteria_name = N'Presentation'
)
BEGIN
    INSERT INTO ScoringCriteria (round_id, criteria_name, weight, criteria_type)
    VALUES (@FinalRoundId, N'Presentation', 30.00, 'SoftSkill');
END;

DECLARE @Criteria1 INT = (
    SELECT TOP 1 criteria_id
    FROM ScoringCriteria
    WHERE round_id = @FinalRoundId
      AND criteria_name = N'Problem-Solution Fit'
    ORDER BY criteria_id
);
DECLARE @Criteria2 INT = (
    SELECT TOP 1 criteria_id
    FROM ScoringCriteria
    WHERE round_id = @FinalRoundId
      AND criteria_name = N'Implementation Quality'
    ORDER BY criteria_id
);
DECLARE @Criteria3 INT = (
    SELECT TOP 1 criteria_id
    FROM ScoringCriteria
    WHERE round_id = @FinalRoundId
      AND criteria_name = N'Presentation'
    ORDER BY criteria_id
);

DECLARE @WebJudge1 INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'ngon.judge'
      AND ur.role_type = 'Judge'
);
DECLARE @WebJudge2 INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'hao.judge'
      AND ur.role_type = 'Judge'
);
DECLARE @AiJudge1 INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'trinh.judge'
      AND ur.role_type = 'Judge'
);
DECLARE @AiJudge2 INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'ngon.judge'
      AND ur.role_type = 'Judge'
);

IF @WebJudge1 IS NULL OR @WebJudge2 IS NULL OR @AiJudge1 IS NULL OR @AiJudge2 IS NULL
    THROW 51004, 'Required demo judge roles were not found. Run seed_test_data.sql first.', 1;

IF NOT EXISTS (
    SELECT 1 FROM JudgeAssignment
    WHERE round_id = @FinalRoundId AND track_id = @WebTrackId AND user_role_id = @WebJudge1
)
BEGIN
    INSERT INTO JudgeAssignment (round_id, track_id, user_role_id)
    VALUES (@FinalRoundId, @WebTrackId, @WebJudge1);
END;

IF NOT EXISTS (
    SELECT 1 FROM JudgeAssignment
    WHERE round_id = @FinalRoundId AND track_id = @WebTrackId AND user_role_id = @WebJudge2
)
BEGIN
    INSERT INTO JudgeAssignment (round_id, track_id, user_role_id)
    VALUES (@FinalRoundId, @WebTrackId, @WebJudge2);
END;

IF NOT EXISTS (
    SELECT 1 FROM JudgeAssignment
    WHERE round_id = @FinalRoundId AND track_id = @AiTrackId AND user_role_id = @AiJudge1
)
BEGIN
    INSERT INTO JudgeAssignment (round_id, track_id, user_role_id)
    VALUES (@FinalRoundId, @AiTrackId, @AiJudge1);
END;

IF NOT EXISTS (
    SELECT 1 FROM JudgeAssignment
    WHERE round_id = @FinalRoundId AND track_id = @AiTrackId AND user_role_id = @AiJudge2
)
BEGIN
    INSERT INTO JudgeAssignment (round_id, track_id, user_role_id)
    VALUES (@FinalRoundId, @AiTrackId, @AiJudge2);
END;

DECLARE @WebAssignment1 INT = (
    SELECT TOP 1 judge_assignment_id
    FROM JudgeAssignment
    WHERE round_id = @FinalRoundId AND track_id = @WebTrackId AND user_role_id = @WebJudge1
);
DECLARE @WebAssignment2 INT = (
    SELECT TOP 1 judge_assignment_id
    FROM JudgeAssignment
    WHERE round_id = @FinalRoundId AND track_id = @WebTrackId AND user_role_id = @WebJudge2
);
DECLARE @AiAssignment1 INT = (
    SELECT TOP 1 judge_assignment_id
    FROM JudgeAssignment
    WHERE round_id = @FinalRoundId AND track_id = @AiTrackId AND user_role_id = @AiJudge1
);
DECLARE @AiAssignment2 INT = (
    SELECT TOP 1 judge_assignment_id
    FROM JudgeAssignment
    WHERE round_id = @FinalRoundId AND track_id = @AiTrackId AND user_role_id = @AiJudge2
);

DECLARE @Finalists TABLE (
    team_name NVARCHAR(100),
    join_code VARCHAR(20),
    repo_slug VARCHAR(120),
    score_value DECIMAL(5,2)
);

INSERT INTO @Finalists (team_name, join_code, repo_slug, score_value)
VALUES
    (N'Web Velocity', 'WEBV1001', 'web-velocity-finals', 9.20),
    (N'Pixel Raiders', 'WEBV1002', 'pixel-raiders-finals', 8.85),
    (N'Neural Forge', 'AIDT1001', 'neural-forge-finals', 9.35),
    (N'Signal Stack', 'AIDT1002', 'signal-stack-finals', 9.95);

IF EXISTS (
    SELECT 1
    FROM @Finalists f
    WHERE NOT EXISTS (
        SELECT 1
        FROM Team t
        WHERE t.join_code = f.join_code
           OR t.team_name = f.team_name
    )
)
BEGIN
    THROW 51005, 'Finalist teams were not found. Run demo_ranking_round3_10_teams.sql first.', 1;
END;

UPDATE HackathonEvent
SET status = 'Ongoing',
    published_at = NULL
WHERE event_id = @EventId;

UPDATE Round
SET score_locked = 0
WHERE round_id = @FinalRoundId;

DELETE FROM Ranking
WHERE round_id = @FinalRoundId;

DECLARE
    @TeamName NVARCHAR(100),
    @JoinCode VARCHAR(20),
    @RepoSlug VARCHAR(120),
    @ScoreValue DECIMAL(5,2),
    @TeamId INT,
    @TrackId INT,
    @LeaderRoleId INT,
    @SubmissionId INT,
    @JudgeAssignment1 INT,
    @JudgeAssignment2 INT;

DECLARE finalist_cursor CURSOR LOCAL FAST_FORWARD FOR
SELECT team_name, join_code, repo_slug, score_value
FROM @Finalists;

OPEN finalist_cursor;
FETCH NEXT FROM finalist_cursor INTO @TeamName, @JoinCode, @RepoSlug, @ScoreValue;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @TeamId = NULL;
    SET @TrackId = NULL;
    SET @LeaderRoleId = NULL;
    SET @SubmissionId = NULL;
    SET @JudgeAssignment1 = NULL;
    SET @JudgeAssignment2 = NULL;

    SELECT TOP 1
        @TeamId = team_id,
        @TrackId = track_id,
        @LeaderRoleId = user_role_id
    FROM Team
    WHERE join_code = @JoinCode
       OR team_name = @TeamName
    ORDER BY CASE WHEN join_code = @JoinCode THEN 0 ELSE 1 END, team_id;

    IF @TeamId IS NULL
        THROW 51006, 'A finalist team could not be resolved.', 1;

    IF @TrackId = @WebTrackId
    BEGIN
        SET @JudgeAssignment1 = @WebAssignment1;
        SET @JudgeAssignment2 = @WebAssignment2;
    END
    ELSE IF @TrackId = @AiTrackId
    BEGIN
        SET @JudgeAssignment1 = @AiAssignment1;
        SET @JudgeAssignment2 = @AiAssignment2;
    END
    ELSE
    BEGIN
        THROW 51007, 'A finalist team does not belong to a supported Summer 2026 track.', 1;
    END;

    SELECT @SubmissionId = submission_id
    FROM Submission
    WHERE team_id = @TeamId
      AND round_id = @FinalRoundId;

    IF @SubmissionId IS NULL
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
            @FinalRoundId,
            CONCAT('https://github.com/seal-demo/', @RepoSlug),
            CONCAT('https://youtu.be/demo-', @RepoSlug),
            CONCAT('https://docs.google.com/presentation/d/', @RepoSlug),
            NULL,
            0,
            'Evaluating',
            @Now,
            @Now,
            @LeaderRoleId
        );

        SET @SubmissionId = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE Submission
        SET repository_url = CONCAT('https://github.com/seal-demo/', @RepoSlug),
            demo_url = CONCAT('https://youtu.be/demo-', @RepoSlug),
            slide_url = CONCAT('https://docs.google.com/presentation/d/', @RepoSlug),
            status = 'Evaluating',
            updated_at = @Now,
            submitted_by_user_role_id = @LeaderRoleId
        WHERE submission_id = @SubmissionId;
    END;

    MERGE JudgeEvaluation AS target
    USING (
        SELECT @SubmissionId AS submission_id, @JudgeAssignment1 AS judge_assignment_id
        UNION ALL
        SELECT @SubmissionId, @JudgeAssignment2
    ) AS source
    ON target.submission_id = source.submission_id
       AND target.judge_assignment_id = source.judge_assignment_id
    WHEN MATCHED THEN
        UPDATE SET status = 'Finalized',
                   finalized_at = @Now,
                   updated_at = @Now
    WHEN NOT MATCHED THEN
        INSERT (submission_id, judge_assignment_id, status, finalized_at, created_at, updated_at)
        VALUES (source.submission_id, source.judge_assignment_id, 'Finalized', @Now, @Now, @Now);

    MERGE Score AS target
    USING (
        SELECT @SubmissionId AS submission_id, @JudgeAssignment1 AS judge_assignment_id, @Criteria1 AS criteria_id, @ScoreValue AS score_value
        UNION ALL SELECT @SubmissionId, @JudgeAssignment1, @Criteria2, @ScoreValue - 0.10
        UNION ALL SELECT @SubmissionId, @JudgeAssignment1, @Criteria3, @ScoreValue + 0.05
        UNION ALL SELECT @SubmissionId, @JudgeAssignment2, @Criteria1, @ScoreValue - 0.15
        UNION ALL SELECT @SubmissionId, @JudgeAssignment2, @Criteria2, @ScoreValue - 0.05
        UNION ALL SELECT @SubmissionId, @JudgeAssignment2, @Criteria3, @ScoreValue
    ) AS source
    ON target.submission_id = source.submission_id
       AND target.judge_assignment_id = source.judge_assignment_id
       AND target.criteria_id = source.criteria_id
    WHEN MATCHED THEN
        UPDATE SET score_value = source.score_value,
                   comment = CONCAT(N'Demo final score for ', @TeamName),
                   scored_at = @Now
    WHEN NOT MATCHED THEN
        INSERT (submission_id, criteria_id, judge_assignment_id, score_value, comment, scored_at)
        VALUES (source.submission_id, source.criteria_id, source.judge_assignment_id, source.score_value, CONCAT(N'Demo final score for ', @TeamName), @Now);

    FETCH NEXT FROM finalist_cursor INTO @TeamName, @JoinCode, @RepoSlug, @ScoreValue;
END;

CLOSE finalist_cursor;
DEALLOCATE finalist_cursor;

SELECT
    e.name AS event_name,
    r.round_id,
    r.round_name,
    r.score_locked,
    COUNT(DISTINCT s.submission_id) AS final_submission_count,
    COUNT(DISTINCT je.evaluation_id) AS finalized_evaluation_count,
    COUNT(DISTINCT sc.score_id) AS score_count
FROM HackathonEvent e
JOIN Round r ON r.event_id = e.event_id
LEFT JOIN Submission s ON s.round_id = r.round_id
LEFT JOIN JudgeEvaluation je ON je.submission_id = s.submission_id
LEFT JOIN Score sc ON sc.submission_id = s.submission_id
WHERE e.event_id = @EventId
  AND r.round_id = @FinalRoundId
GROUP BY e.name, r.round_id, r.round_name, r.score_locked;
