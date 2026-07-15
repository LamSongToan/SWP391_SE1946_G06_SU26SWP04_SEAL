USE SEAL_Hackathon_G06;
GO

SET NOCOUNT ON;

DECLARE @ScenarioKey NVARCHAR(120) = N'final_scoring_closed_ready_to_publish';
DECLARE @ScenarioTitle NVARCHAR(180) = N'Final scoring closed ready to publish';
DECLARE @ScenarioDescription NVARCHAR(500) = N'Lifecycle demo: Final scoring time is over, final submissions already have scores, and the coordinator can finalize then publish results.';
DECLARE @ScenarioNow DATETIME2 = '2026-07-15T09:00:00';
DECLARE @PublishedAt DATETIME2 = '2026-06-07T09:00:00';
DECLARE @RegistrationStart DATETIME2 = '2026-06-09T09:00:00';
DECLARE @RegistrationEnd DATETIME2 = '2026-06-17T09:00:00';
DECLARE @CompetitionStart DATETIME2 = '2026-06-19T09:00:00';
DECLARE @CompetitionEnd DATETIME2 = '2026-07-19T09:00:00';
DECLARE @QualifierStart DATETIME2 = '2026-06-19T09:00:00';
DECLARE @QualifierDeadline DATETIME2 = '2026-06-26T09:00:00';
DECLARE @QualifierEnd DATETIME2 = '2026-06-29T09:00:00';
DECLARE @FinalStart DATETIME2 = '2026-07-08T09:00:00';
DECLARE @FinalDeadline DATETIME2 = '2026-07-12T09:00:00';
DECLARE @FinalEnd DATETIME2 = '2026-07-14T09:00:00';
DECLARE @EventStatus VARCHAR(30) = 'Ongoing';

DECLARE @IncludeTeams BIT = 1;
DECLARE @IncludeWaitingIndividuals BIT = 0;
DECLARE @IncludeQualifierSubmissions BIT = 1;
DECLARE @IncludeQualifierScores BIT = 1;
DECLARE @LockQualifierRound BIT = 1;
DECLARE @CalculateQualifier BIT = 1;
DECLARE @ApplyAdvancement BIT = 1;
DECLARE @PublishQualifierResults BIT = @ApplyAdvancement;
DECLARE @IncludeFinalSubmissions BIT = 1;
DECLARE @IncludeFinalScores BIT = 1;
DECLARE @LockFinalRound BIT = 0;
DECLARE @PublishFinalResults BIT = 0;
DECLARE @SummerAwardsJson NVARCHAR(MAX) = N'[{"awardName":"Champion","quantity":1,"prizeAmountVnd":20000000},{"awardName":"Runner-up","quantity":1,"prizeAmountVnd":10000000}]';
DECLARE @FallbackPasswordHash VARCHAR(255) = '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu';
DECLARE @QualifierTopN INT = 2;

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

DECLARE @CoordinatorRoleId INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'toan.coordinator'
      AND ur.role_type = 'Coordinator'
);
DECLARE @BackupCoordinatorRoleId INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'anh.coordinator'
      AND ur.role_type = 'Coordinator'
);
DECLARE @WebMentorRoleId INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'kiet.mentor'
      AND ur.role_type = 'Mentor'
);
DECLARE @AiMentorRoleId INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'vy.mentor'
      AND ur.role_type = 'Mentor'
);
DECLARE @WebJudgeRoleId1 INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'ngon.judge'
      AND ur.role_type = 'Judge'
);
DECLARE @WebJudgeRoleId2 INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'hao.judge'
      AND ur.role_type = 'Judge'
);
DECLARE @AiJudgeRoleId1 INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'trinh.judge'
      AND ur.role_type = 'Judge'
);
DECLARE @AiJudgeRoleId2 INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'hao.judge'
      AND ur.role_type = 'Judge'
);

IF @CoordinatorRoleId IS NULL OR @WebMentorRoleId IS NULL OR @AiMentorRoleId IS NULL
    OR @WebJudgeRoleId1 IS NULL OR @WebJudgeRoleId2 IS NULL OR @AiJudgeRoleId1 IS NULL OR @AiJudgeRoleId2 IS NULL
    THROW 51003, 'Summer 2026 assignment accounts are incomplete. Re-run seed_test_data.sql first.', 1;

IF @WebJudgeRoleId1 = @WebJudgeRoleId2
    OR @AiJudgeRoleId1 = @AiJudgeRoleId2
    OR @WebJudgeRoleId1 = @AiJudgeRoleId1
    OR @WebJudgeRoleId2 = @AiJudgeRoleId1
    THROW 51004, 'Judge accounts must be distinct within each track and across the final-round panel.', 1;

DECLARE @SummerRounds TABLE (round_id INT PRIMARY KEY);
INSERT INTO @SummerRounds (round_id)
VALUES (@QualifierRoundId), (@FinalRoundId);

DECLARE @SummerTracks TABLE (track_id INT PRIMARY KEY);
INSERT INTO @SummerTracks (track_id)
VALUES (@WebTrackId), (@AiTrackId);

DECLARE @SummerTeams TABLE (team_id INT PRIMARY KEY);
INSERT INTO @SummerTeams (team_id)
SELECT team_id
FROM Team
WHERE track_id IN (SELECT track_id FROM @SummerTracks);

DECLARE @SummerSubmissions TABLE (submission_id INT PRIMARY KEY);
INSERT INTO @SummerSubmissions (submission_id)
SELECT submission_id
FROM Submission
WHERE round_id IN (SELECT round_id FROM @SummerRounds)
   OR team_id IN (SELECT team_id FROM @SummerTeams);

DECLARE @SummerEvaluations TABLE (evaluation_id INT PRIMARY KEY);
INSERT INTO @SummerEvaluations (evaluation_id)
SELECT evaluation_id
FROM JudgeEvaluation
WHERE submission_id IN (SELECT submission_id FROM @SummerSubmissions);

DECLARE @SummerPrizes TABLE (prize_id INT PRIMARY KEY);
INSERT INTO @SummerPrizes (prize_id)
SELECT prize_id
FROM Prize
WHERE event_id = @EventId;

DELETE FROM AuditLog
WHERE (target_entity = 'EVENT' AND target_id = @EventId)
   OR (target_entity = 'ROUND' AND target_id IN (SELECT round_id FROM @SummerRounds))
   OR (target_entity = 'TRACK' AND target_id IN (SELECT track_id FROM @SummerTracks))
   OR (target_entity = 'TEAM' AND target_id IN (SELECT team_id FROM @SummerTeams))
   OR (target_entity = 'SUBMISSION' AND target_id IN (SELECT submission_id FROM @SummerSubmissions));

IF OBJECT_ID('dbo.EventUpdateNotification', 'U') IS NOT NULL
BEGIN
    DELETE FROM dbo.EventUpdateNotification
    WHERE event_id = @EventId;
END;

IF OBJECT_ID('dbo.Announcement', 'U') IS NOT NULL
BEGIN
    DELETE FROM dbo.Announcement
    WHERE event_id = @EventId;
END;

DELETE FROM Feedback
WHERE submission_id IN (SELECT submission_id FROM @SummerSubmissions);

DELETE FROM ScoreHistory
WHERE evaluation_id IN (SELECT evaluation_id FROM @SummerEvaluations);

DELETE FROM Score
WHERE submission_id IN (SELECT submission_id FROM @SummerSubmissions);

DELETE FROM JudgeEvaluation
WHERE evaluation_id IN (SELECT evaluation_id FROM @SummerEvaluations);

DELETE FROM SubmissionHistory
WHERE submission_id IN (SELECT submission_id FROM @SummerSubmissions);

DELETE FROM EliminationRecord
WHERE submission_id IN (SELECT submission_id FROM @SummerSubmissions);

DELETE FROM Ranking
WHERE round_id IN (SELECT round_id FROM @SummerRounds);

DELETE FROM TeamPrize
WHERE prize_id IN (SELECT prize_id FROM @SummerPrizes);

DELETE FROM Prize
WHERE event_id = @EventId;

DELETE FROM IndividualRegistration
WHERE event_id = @EventId;

DELETE FROM TeamInvitation
WHERE team_id IN (SELECT team_id FROM @SummerTeams);

DELETE FROM Submission
WHERE submission_id IN (SELECT submission_id FROM @SummerSubmissions);

DELETE FROM TeamMember
WHERE team_id IN (SELECT team_id FROM @SummerTeams);

DELETE FROM Team
WHERE team_id IN (SELECT team_id FROM @SummerTeams);

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
    awards_json = @SummerAwardsJson,
    published_at = @PublishedAt,
    status = @EventStatus,
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
    promotion_rule_top_n = @QualifierTopN,
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

DELETE FROM ScoringCriteria
WHERE round_id IN (@QualifierRoundId, @FinalRoundId);

INSERT INTO ScoringCriteria (round_id, criteria_name, weight, criteria_type)
VALUES
(@QualifierRoundId, N'Technical Quality', 34.00, 'Technical Quality'),
(@QualifierRoundId, N'Innovation', 33.00, 'Innovation'),
(@QualifierRoundId, N'Feasibility', 33.00, 'Feasibility'),
(@FinalRoundId, N'Presentation', 25.00, 'Presentation'),
(@FinalRoundId, N'Q&A', 25.00, 'Q&A'),
(@FinalRoundId, N'Product Demo', 25.00, 'Product Demo'),
(@FinalRoundId, N'Business Impact', 25.00, 'Business Impact');

DELETE FROM JudgeAssignment
WHERE round_id IN (@QualifierRoundId, @FinalRoundId)
  AND track_id IN (@WebTrackId, @AiTrackId);

INSERT INTO JudgeAssignment (round_id, track_id, user_role_id, assigned_at)
VALUES
(@QualifierRoundId, @WebTrackId, @WebJudgeRoleId1, @ScenarioNow),
(@QualifierRoundId, @WebTrackId, @WebJudgeRoleId2, @ScenarioNow),
(@QualifierRoundId, @AiTrackId, @AiJudgeRoleId1, @ScenarioNow),
(@QualifierRoundId, @AiTrackId, @AiJudgeRoleId2, @ScenarioNow),
(@FinalRoundId, @WebTrackId, @WebJudgeRoleId1, @ScenarioNow),
(@FinalRoundId, @WebTrackId, @WebJudgeRoleId2, @ScenarioNow),
(@FinalRoundId, @WebTrackId, @AiJudgeRoleId1, @ScenarioNow);

DELETE FROM TrackMentor
WHERE track_id IN (@WebTrackId, @AiTrackId);

INSERT INTO TrackMentor (track_id, user_role_id, assigned_at)
VALUES
(@WebTrackId, @WebMentorRoleId, @ScenarioNow),
(@AiTrackId, @AiMentorRoleId, @ScenarioNow);

DELETE FROM EventCoordinatorAssignment
WHERE event_id = @EventId;

INSERT INTO EventCoordinatorAssignment (event_id, user_role_id, assigned_at)
VALUES
(@EventId, @CoordinatorRoleId, @ScenarioNow);

IF @BackupCoordinatorRoleId IS NOT NULL
BEGIN
    INSERT INTO EventCoordinatorAssignment (event_id, user_role_id, assigned_at)
    VALUES (@EventId, @BackupCoordinatorRoleId, @ScenarioNow);
END;

DECLARE @TeamSeed TABLE (
    sort_no INT PRIMARY KEY,
    team_name NVARCHAR(100) NOT NULL,
    track_name NVARCHAR(100) NOT NULL,
    join_code VARCHAR(12) NOT NULL,
    repo_slug VARCHAR(120) NOT NULL,
    qualifier_score DECIMAL(5,2) NOT NULL,
    final_score DECIMAL(5,2) NOT NULL,
    accept_auto_assigned_members BIT NOT NULL
);

INSERT INTO @TeamSeed (
    sort_no, team_name, track_name, join_code, repo_slug,
    qualifier_score, final_score, accept_auto_assigned_members
)
VALUES
(1, N'SEAL Coders', N'Web Platform', 'SEAL2026', 'seal-coders', 8.91, 9.18, 1),
(2, N'Web Velocity', N'Web Platform', 'WEBV1001', 'web-velocity', 8.55, 8.85, 0),
(3, N'Pixel Raiders', N'Web Platform', 'WEBV1002', 'pixel-raiders', 8.10, 8.42, 0),
(4, N'Sprint Canvas', N'Web Platform', 'WEBV1003', 'sprint-canvas', 7.85, 8.10, 0),
(5, N'Urban Web Crew', N'Web Platform', 'WEBV1004', 'urban-web-crew', 7.30, 7.95, 0),
(6, N'AI Pioneers', N'AI & Data', 'AIDT1001', 'ai-pioneers', 8.75, 9.32, 1),
(7, N'Neural Forge', N'AI & Data', 'AIDT1002', 'neural-forge', 8.40, 8.78, 1),
(8, N'Signal Stack', N'AI & Data', 'AIDT1003', 'signal-stack', 7.95, 8.18, 0),
(9, N'Data Vision', N'AI & Data', 'AIDT1005', 'data-vision', 7.55, 7.96, 0),
(10, N'Flow Frontier', N'Web Platform', 'WEBV1005', 'flow-frontier', 7.22, 7.84, 1),
(11, N'Interface Union', N'Web Platform', 'WEBV1006', 'interface-union', 7.14, 7.76, 0),
(12, N'Portal Pulse', N'Web Platform', 'WEBV1007', 'portal-pulse', 7.05, 7.68, 1),
(13, N'Visionary Labs', N'AI & Data', 'AIDT1006', 'visionary-labs', 7.42, 7.90, 1),
(14, N'Tensor Titans', N'AI & Data', 'AIDT1007', 'tensor-titans', 7.36, 7.82, 0),
(15, N'Model Mavericks', N'AI & Data', 'AIDT1008', 'model-mavericks', 7.28, 7.73, 1),
(16, N'Insight Ops', N'AI & Data', 'AIDT1009', 'insight-ops', 7.12, 7.65, 0);

DECLARE @WaitingSeed TABLE (
    username VARCHAR(100) NOT NULL,
    track_name NVARCHAR(100) NOT NULL
);

INSERT INTO @WaitingSeed (
    username, track_name
)
VALUES
('huy.student', N'Web Platform'),
('minh.student', N'Web Platform'),
('dat.student', N'AI & Data');

IF @IncludeTeams = 1
BEGIN
    DECLARE
        @CurrentSortNo INT,
        @CurrentTeamName NVARCHAR(100),
        @CurrentTrackName NVARCHAR(100),
        @CurrentJoinCode VARCHAR(12),
        @CurrentRepoSlug VARCHAR(120),
        @CurrentQualifierScore DECIMAL(5,2),
        @CurrentFinalScore DECIMAL(5,2),
        @CurrentAcceptAutoAssignedMembers BIT,
        @CurrentTrackId INT,
        @CurrentLeaderRoleId INT,
        @CurrentTeamId INT,
        @GeneratedUsername VARCHAR(100),
        @GeneratedUserRoleId INT;

    DECLARE @CurrentMembers TABLE (
        slot_no INT PRIMARY KEY,
        user_role_id INT NOT NULL
    );

    DECLARE team_cursor CURSOR FAST_FORWARD FOR
    SELECT
        sort_no,
        team_name,
        track_name,
        join_code,
        repo_slug,
        qualifier_score,
        final_score,
        accept_auto_assigned_members
    FROM @TeamSeed
    ORDER BY sort_no;

    OPEN team_cursor;
    FETCH NEXT FROM team_cursor INTO
        @CurrentSortNo,
        @CurrentTeamName,
        @CurrentTrackName,
        @CurrentJoinCode,
        @CurrentRepoSlug,
        @CurrentQualifierScore,
        @CurrentFinalScore,
        @CurrentAcceptAutoAssignedMembers;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        DELETE FROM @CurrentMembers;
        SET @CurrentTrackId = CASE WHEN @CurrentTrackName = N'Web Platform' THEN @WebTrackId ELSE @AiTrackId END;
        SET @CurrentLeaderRoleId = NULL;

        INSERT INTO @CurrentMembers (slot_no, user_role_id)
        SELECT
            slots.slot_no,
            ur.user_role_id
        FROM (
            VALUES
                (1, CASE
                        WHEN @CurrentTeamName = N'SEAL Coders' THEN 'an.student'
                        ELSE CONCAT('demo.', @CurrentRepoSlug, '.1')
                    END),
                (2, CASE
                        WHEN @CurrentTeamName = N'SEAL Coders' THEN 'linh.student'
                        ELSE CONCAT('demo.', @CurrentRepoSlug, '.2')
                    END),
                (3, CASE
                        WHEN @CurrentTeamName = N'SEAL Coders' THEN 'mai.student'
                        ELSE CONCAT('demo.', @CurrentRepoSlug, '.3')
                    END)
        ) AS slots(slot_no, username)
        JOIN [Users] u
          ON u.username = slots.username
        JOIN UserRole ur
          ON ur.user_id = u.user_id
         AND ur.role_type = 'Student';

        IF (SELECT COUNT(*) FROM @CurrentMembers) <> 3
        BEGIN
            THROW 51004, 'Lifecycle demo expects existing seeded student accounts for every team member. Re-run seed_test_data.sql first.', 1;
        END;

        SELECT @CurrentLeaderRoleId = user_role_id
        FROM @CurrentMembers
        WHERE slot_no = 1;

        INSERT INTO Team (
            track_id,
            user_role_id,
            team_name,
            join_code,
            accept_auto_assigned_members,
            status,
            created_at
        )
        VALUES (
            @CurrentTrackId,
            @CurrentLeaderRoleId,
            @CurrentTeamName,
            @CurrentJoinCode,
            @CurrentAcceptAutoAssignedMembers,
            'Ready',
            DATEADD(HOUR, @CurrentSortNo, @RegistrationStart)
        );

        SET @CurrentTeamId = SCOPE_IDENTITY();

        INSERT INTO TeamMember (team_id, user_role_id, joined_at)
        SELECT
            @CurrentTeamId,
            user_role_id,
            DATEADD(HOUR, @CurrentSortNo, @RegistrationStart)
        FROM @CurrentMembers
        ORDER BY slot_no;

        FETCH NEXT FROM team_cursor INTO
            @CurrentSortNo,
            @CurrentTeamName,
            @CurrentTrackName,
            @CurrentJoinCode,
            @CurrentRepoSlug,
            @CurrentQualifierScore,
            @CurrentFinalScore,
            @CurrentAcceptAutoAssignedMembers;
    END;

    CLOSE team_cursor;
    DEALLOCATE team_cursor;
END;

IF @IncludeWaitingIndividuals = 1
BEGIN
    DECLARE
        @WaitingUsername VARCHAR(100),
        @WaitingTrackName NVARCHAR(100),
        @WaitingTrackId INT,
        @WaitingUserRoleId INT,
        @WaitingCounter INT = 0;

    DECLARE waiting_cursor CURSOR FAST_FORWARD FOR
    SELECT username, track_name
    FROM @WaitingSeed;

    OPEN waiting_cursor;
    FETCH NEXT FROM waiting_cursor INTO
        @WaitingUsername,
        @WaitingTrackName;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @WaitingCounter += 1;
        SET @WaitingTrackId = CASE WHEN @WaitingTrackName = N'Web Platform' THEN @WebTrackId ELSE @AiTrackId END;
        SET @WaitingUserRoleId = NULL;

        SELECT @WaitingUserRoleId = user_role_id
        FROM [Users] u
        JOIN UserRole ur
          ON ur.user_id = u.user_id
         AND ur.role_type = 'Student'
        WHERE u.username = @WaitingUsername;

        IF @WaitingUserRoleId IS NULL
        BEGIN
            THROW 51005, 'Lifecycle demo expects existing seeded waiting student accounts. Re-run seed_test_data.sql first.', 1;
        END;

        INSERT INTO IndividualRegistration (
            event_id,
            user_role_id,
            preferred_track_id,
            assigned_team_id,
            status,
            created_at,
            matched_at
        )
        VALUES (
            @EventId,
            @WaitingUserRoleId,
            @WaitingTrackId,
            NULL,
            'Waiting',
            DATEADD(HOUR, @WaitingCounter, @RegistrationStart),
            NULL
        );

        FETCH NEXT FROM waiting_cursor INTO
            @WaitingUsername,
            @WaitingTrackName;
    END;

    CLOSE waiting_cursor;
    DEALLOCATE waiting_cursor;
END;

IF @IncludeQualifierSubmissions = 1
BEGIN
    INSERT INTO Submission (
        team_id,
        round_id,
        repository_url,
        demo_url,
        slide_url,
        github_metadata,
        status,
        submitted_at,
        updated_at,
        submitted_by_user_role_id
    )
    SELECT
        t.team_id,
        @QualifierRoundId,
        CASE
            WHEN ts.team_name = N'SEAL Coders' THEN 'https://github.com/LamSongToan/SWP391_SE1946_G06_SU26SWP04_SEAL'
            ELSE CONCAT('https://github.com/seal-demo/', ts.repo_slug)
        END,
        CONCAT('https://youtu.be/demo-', ts.repo_slug),
        CONCAT('https://docs.google.com/presentation/d/', ts.repo_slug),
        NULL,
        CASE WHEN @IncludeQualifierScores = 1 THEN 'Evaluating' ELSE 'Submitted' END,
        DATEADD(HOUR, ts.sort_no, DATEADD(HOUR, -12, @QualifierDeadline)),
        DATEADD(HOUR, ts.sort_no, DATEADD(HOUR, -12, @QualifierDeadline)),
        t.user_role_id
    FROM Team t
    JOIN @TeamSeed ts ON ts.team_name = t.team_name;

    IF @IncludeQualifierScores = 1
    BEGIN
        INSERT INTO JudgeEvaluation (
            submission_id,
            judge_assignment_id,
            status,
            finalized_at,
            created_at,
            updated_at
        )
        SELECT
            s.submission_id,
            ja.judge_assignment_id,
            'Finalized',
            DATEADD(HOUR, 2, s.submitted_at),
            DATEADD(HOUR, 1, s.submitted_at),
            DATEADD(HOUR, 2, s.submitted_at)
        FROM Submission s
        JOIN Team t ON t.team_id = s.team_id
        JOIN JudgeAssignment ja
            ON ja.round_id = s.round_id
           AND ja.track_id = t.track_id
        WHERE s.round_id = @QualifierRoundId;

        INSERT INTO Score (
            submission_id,
            criteria_id,
            judge_assignment_id,
            score_value,
            comment,
            scored_at
        )
        SELECT
            s.submission_id,
            c.criteria_id,
            ja.judge_assignment_id,
            ts.qualifier_score,
            CONCAT(N'Lifecycle demo qualifier score for ', ts.team_name),
            DATEADD(HOUR, 2, s.submitted_at)
        FROM Submission s
        JOIN Team t ON t.team_id = s.team_id
        JOIN @TeamSeed ts ON ts.team_name = t.team_name
        JOIN ScoringCriteria c ON c.round_id = s.round_id
        JOIN JudgeAssignment ja
            ON ja.round_id = s.round_id
           AND ja.track_id = t.track_id
        WHERE s.round_id = @QualifierRoundId;

        INSERT INTO ScoreHistory (
            evaluation_id,
            criteria_id,
            old_score_value,
            new_score_value,
            old_comment,
            new_comment,
            action_type,
            created_at
        )
        SELECT
            je.evaluation_id,
            c.criteria_id,
            NULL,
            ts.qualifier_score,
            NULL,
            CONCAT(N'Lifecycle demo qualifier score for ', ts.team_name),
            'FINALIZE',
            DATEADD(HOUR, 2, s.submitted_at)
        FROM Submission s
        JOIN Team t ON t.team_id = s.team_id
        JOIN @TeamSeed ts ON ts.team_name = t.team_name
        JOIN ScoringCriteria c ON c.round_id = s.round_id
        JOIN JudgeAssignment ja
            ON ja.round_id = s.round_id
           AND ja.track_id = t.track_id
        JOIN JudgeEvaluation je
            ON je.submission_id = s.submission_id
           AND je.judge_assignment_id = ja.judge_assignment_id
        WHERE s.round_id = @QualifierRoundId;
    END;
END;

IF @LockQualifierRound = 1
BEGIN
    ;WITH QualifierScores AS (
        SELECT
            s.team_id,
            t.track_id,
            t.team_name,
            CAST(ROUND(AVG(sc.score_value), 2) AS DECIMAL(5,2)) AS total_score
        FROM Submission s
        JOIN Team t ON t.team_id = s.team_id
        JOIN Score sc ON sc.submission_id = s.submission_id
        WHERE s.round_id = @QualifierRoundId
        GROUP BY s.team_id, t.track_id, t.team_name
    ),
    RankedQualifier AS (
        SELECT
            qs.team_id,
            qs.total_score,
            ROW_NUMBER() OVER (
                PARTITION BY qs.track_id
                ORDER BY qs.total_score DESC, qs.team_name ASC
            ) AS rank_position
        FROM QualifierScores qs
    )
    INSERT INTO Ranking (
        team_id,
        round_id,
        prize_id,
        rank_position,
        total_score,
        qualified_next_round,
        calculated_at,
        qualification_status,
        qualification_note,
        qualification_calculated_at
    )
    SELECT
        rq.team_id,
        @QualifierRoundId,
        NULL,
        rq.rank_position,
        rq.total_score,
        0,
        @ScenarioNow,
        'Pending',
        N'Round finalized. Calculate qualification to determine who advances to Finals.',
        NULL
    FROM RankedQualifier rq
    ORDER BY rq.rank_position, rq.team_id;

    UPDATE [Round]
    SET score_locked = 1
    WHERE round_id = @QualifierRoundId;
END;

IF @CalculateQualifier = 1
BEGIN
    UPDATE Ranking
    SET qualified_next_round = 0,
        qualification_status = CASE
            WHEN rank_position <= @QualifierTopN THEN 'Qualified'
            ELSE 'Eliminated'
        END,
        qualification_note = CASE
            WHEN rank_position <= @QualifierTopN THEN N'Qualified to Finals as a top team in this track.'
            ELSE N'Eliminated after qualifier ranking.'
        END,
        qualification_calculated_at = @ScenarioNow
    WHERE round_id = @QualifierRoundId;
END;

IF @ApplyAdvancement = 1
BEGIN
    UPDATE Ranking
    SET qualified_next_round = CASE
            WHEN qualification_status = 'Qualified' THEN 1
            ELSE 0
        END
    WHERE round_id = @QualifierRoundId;

    UPDATE s
    SET status = CASE
            WHEN r.qualification_status = 'Qualified' THEN 'Qualified'
            WHEN r.qualification_status = 'Eliminated' THEN 'Eliminated'
            ELSE s.status
        END,
        updated_at = @ScenarioNow
    FROM Submission s
    JOIN Ranking r
      ON r.team_id = s.team_id
     AND r.round_id = s.round_id
    WHERE s.round_id = @QualifierRoundId;
END;

IF @PublishQualifierResults = 1
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
        timestamp
    )
    SELECT
        ur.user_id,
        'ROUND_RESULTS_PUBLISHED',
        'ROUND',
        @QualifierRoundId,
        r.round_name,
        N'{"roundPublished":false}',
        CONCAT(
            N'{"eventId":', @EventId,
            N',"roundId":', @QualifierRoundId,
            N',"publishedAt":"', CONVERT(NVARCHAR(30), @ScenarioNow, 126),
            N'","finalRound":false}'
        ),
        N'Qualifier leaderboard published after finalization, qualification calculation, and promotion.',
        @ScenarioNow
    FROM UserRole ur
    JOIN [Round] r ON r.round_id = @QualifierRoundId
    WHERE ur.user_role_id = @CoordinatorRoleId;
END;

IF @IncludeFinalSubmissions = 1
BEGIN
    INSERT INTO Submission (
        team_id,
        round_id,
        repository_url,
        demo_url,
        slide_url,
        github_metadata,
        status,
        submitted_at,
        updated_at,
        submitted_by_user_role_id
    )
    SELECT
        t.team_id,
        @FinalRoundId,
        CASE
            WHEN ts.team_name = N'SEAL Coders' THEN 'https://github.com/LamSongToan/SWP391_SE1946_G06_SU26SWP04_SEAL'
            ELSE CONCAT('https://github.com/seal-demo/', ts.repo_slug, '-final')
        END,
        CONCAT('https://youtu.be/final-', ts.repo_slug),
        CONCAT('https://docs.google.com/presentation/d/final-', ts.repo_slug),
        NULL,
        CASE WHEN @IncludeFinalScores = 1 THEN 'Evaluating' ELSE 'Submitted' END,
        DATEADD(HOUR, ts.sort_no, DATEADD(HOUR, -12, @FinalDeadline)),
        DATEADD(HOUR, ts.sort_no, DATEADD(HOUR, -12, @FinalDeadline)),
        t.user_role_id
    FROM Team t
    JOIN @TeamSeed ts ON ts.team_name = t.team_name
    JOIN Ranking r ON r.team_id = t.team_id
    WHERE r.round_id = @QualifierRoundId
      AND r.qualification_status = 'Qualified';

    IF @IncludeFinalScores = 1
    BEGIN
        INSERT INTO JudgeEvaluation (
            submission_id,
            judge_assignment_id,
            status,
            finalized_at,
            created_at,
            updated_at
        )
        SELECT
            s.submission_id,
            ja.judge_assignment_id,
            'Finalized',
            DATEADD(HOUR, 2, s.submitted_at),
            DATEADD(HOUR, 1, s.submitted_at),
            DATEADD(HOUR, 2, s.submitted_at)
        FROM Submission s
        JOIN Team t ON t.team_id = s.team_id
        JOIN JudgeAssignment ja
            ON ja.round_id = s.round_id
        WHERE s.round_id = @FinalRoundId;

        INSERT INTO Score (
            submission_id,
            criteria_id,
            judge_assignment_id,
            score_value,
            comment,
            scored_at
        )
        SELECT
            s.submission_id,
            c.criteria_id,
            ja.judge_assignment_id,
            ts.final_score,
            CONCAT(N'Lifecycle demo final score for ', ts.team_name),
            DATEADD(HOUR, 2, s.submitted_at)
        FROM Submission s
        JOIN Team t ON t.team_id = s.team_id
        JOIN @TeamSeed ts ON ts.team_name = t.team_name
        JOIN ScoringCriteria c ON c.round_id = s.round_id
        JOIN JudgeAssignment ja
            ON ja.round_id = s.round_id
        WHERE s.round_id = @FinalRoundId;
    END;
END;

IF @LockFinalRound = 1
BEGIN
    ;WITH FinalScores AS (
        SELECT
            s.team_id,
            t.team_name,
            CAST(ROUND(AVG(sc.score_value), 2) AS DECIMAL(5,2)) AS total_score
        FROM Submission s
        JOIN Team t ON t.team_id = s.team_id
        JOIN Score sc ON sc.submission_id = s.submission_id
        WHERE s.round_id = @FinalRoundId
        GROUP BY s.team_id, t.team_name
    ),
    RankedFinal AS (
        SELECT
            fs.team_id,
            fs.total_score,
            ROW_NUMBER() OVER (
                ORDER BY fs.total_score DESC, fs.team_name ASC
            ) AS rank_position
        FROM FinalScores fs
    )
    INSERT INTO Ranking (
        team_id,
        round_id,
        prize_id,
        rank_position,
        total_score,
        qualified_next_round,
        calculated_at,
        qualification_status,
        qualification_note,
        qualification_calculated_at
    )
    SELECT
        rf.team_id,
        @FinalRoundId,
        NULL,
        rf.rank_position,
        rf.total_score,
        0,
        @ScenarioNow,
        'Not Applicable',
        N'Final round ranking is ready for result publication.',
        @ScenarioNow
    FROM RankedFinal rf
    ORDER BY rf.rank_position, rf.team_id;

    UPDATE [Round]
    SET score_locked = 1
    WHERE round_id = @FinalRoundId;
END;

IF @PublishFinalResults = 1
BEGIN
    INSERT INTO Prize (event_id, prize_name, amount_vnd)
    VALUES
    (@EventId, N'Champion', 20000000),
    (@EventId, N'Runner-up', 10000000);

    DECLARE @ChampionPrizeId INT = (
        SELECT TOP 1 prize_id
        FROM Prize
        WHERE event_id = @EventId
          AND prize_name = N'Champion'
        ORDER BY prize_id DESC
    );
    DECLARE @RunnerUpPrizeId INT = (
        SELECT TOP 1 prize_id
        FROM Prize
        WHERE event_id = @EventId
          AND prize_name = N'Runner-up'
        ORDER BY prize_id DESC
    );

    UPDATE Ranking
    SET prize_id = CASE
            WHEN rank_position = 1 THEN @ChampionPrizeId
            WHEN rank_position = 2 THEN @RunnerUpPrizeId
            ELSE NULL
        END,
        qualification_note = CASE
            WHEN rank_position = 1 THEN N'Champion after final round publication.'
            WHEN rank_position = 2 THEN N'Runner-up after final round publication.'
            ELSE N'Final round ranking published.'
        END,
        qualification_calculated_at = @ScenarioNow
    WHERE round_id = @FinalRoundId;

    INSERT INTO TeamPrize (team_id, prize_id, awarded_at)
    SELECT team_id, prize_id, DATEADD(MINUTE, rank_position, @ScenarioNow)
    FROM Ranking
    WHERE round_id = @FinalRoundId
      AND prize_id IS NOT NULL;
END;

SELECT
    e.event_id,
    e.name,
    e.status,
    e.registration_start_at,
    e.registration_end_at,
    e.competition_start_at,
    e.competition_end_at,
    e.track_selection_mode,
    e.min_team_size,
    e.max_team_size
FROM HackathonEvent e
WHERE e.event_id = @EventId;

SELECT
    t.name AS track_name,
    t.min_teams,
    t.max_teams,
    COUNT(team.team_id) AS team_count
FROM Track t
LEFT JOIN Team team ON team.track_id = t.track_id
WHERE t.event_id = @EventId
GROUP BY t.name, t.min_teams, t.max_teams
ORDER BY t.name;

SELECT
    r.round_name,
    r.start_at,
    r.submission_deadline,
    r.end_at,
    r.score_locked,
    COUNT(DISTINCT s.submission_id) AS submission_count,
    COUNT(DISTINCT rk.ranking_id) AS ranking_count
FROM [Round] r
LEFT JOIN Submission s ON s.round_id = r.round_id
LEFT JOIN Ranking rk ON rk.round_id = r.round_id
WHERE r.event_id = @EventId
GROUP BY r.round_name, r.start_at, r.submission_deadline, r.end_at, r.score_locked, r.round_order
ORDER BY r.round_order;

SELECT
    ir.status,
    COUNT(*) AS registration_count
FROM IndividualRegistration ir
WHERE ir.event_id = @EventId
GROUP BY ir.status
ORDER BY ir.status;

SELECT
    al.action_type,
    al.target_entity,
    al.target_id AS round_id,
    al.target_name AS round_name,
    al.timestamp AS published_at
FROM AuditLog al
WHERE al.action_type = 'ROUND_RESULTS_PUBLISHED'
  AND al.target_entity = 'ROUND'
  AND al.target_id = @QualifierRoundId;

SELECT
    p.prize_name,
    tp.team_id,
    tm.team_name,
    tp.awarded_at
FROM TeamPrize tp
JOIN Prize p ON p.prize_id = tp.prize_id
JOIN Team tm ON tm.team_id = tp.team_id
WHERE p.event_id = @EventId
ORDER BY tp.awarded_at, p.prize_name, tm.team_name;
