param(
    [string]$AnchorDate = ""
)

$ErrorActionPreference = "Stop"

function Resolve-AnchorDate {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return (Get-Date).Date.AddHours(9)
    }

    try {
        $parsedDate = [datetime]::ParseExact(
            $Value,
            "yyyy-MM-dd",
            [System.Globalization.CultureInfo]::InvariantCulture
        )
    } catch {
        throw "Invalid anchor date '$Value'. Use yyyy-MM-dd, for example 2026-07-15."
    }

    return $parsedDate.Date.AddHours(9)
}

function ConvertTo-SqlDateTime {
    param([datetime]$Value)
    return $Value.ToString("yyyy-MM-ddTHH:mm:ss")
}

function ConvertTo-SqlBit {
    param([bool]$Value)
    if ($Value) { return "1" }
    return "0"
}

function Escape-SqlString {
    param([string]$Value)
    if ($null -eq $Value) { return "" }
    return $Value.Replace("'", "''")
}

function Render-TeamSeedValues {
    param([array]$Teams)
    return ($Teams | ForEach-Object {
        "({0}, N'{1}', N'{2}', '{3}', '{4}', {5}, {6}, {7})" -f `
            $_.SortNo, `
            (Escape-SqlString $_.TeamName), `
            (Escape-SqlString $_.TrackName), `
            (Escape-SqlString $_.JoinCode), `
            (Escape-SqlString $_.RepoSlug), `
            $_.QualifierScore, `
            $_.FinalScore, `
            (ConvertTo-SqlBit $_.AcceptAutoAssignedMembers)
    }) -join ",`r`n"
}

function Render-WaitingSeedValues {
    param([array]$Waiting)
    return ($Waiting | ForEach-Object {
        "('{0}', N'{1}')" -f `
            (Escape-SqlString $_.Username), `
            (Escape-SqlString $_.TrackName)
    }) -join ",`r`n"
}

function New-Scenario {
    param(
        [string]$FileName,
        [string]$Key,
        [string]$Title,
        [string]$Description,
        [datetime]$PublishedAt,
        [datetime]$RegistrationStart,
        [datetime]$RegistrationEnd,
        [datetime]$CompetitionStart,
        [datetime]$CompetitionEnd,
        [datetime]$QualifierStart,
        [datetime]$QualifierDeadline,
        [datetime]$QualifierEnd,
        [datetime]$FinalStart,
        [datetime]$FinalDeadline,
        [datetime]$FinalEnd,
        [string]$EventStatus,
        [bool]$IncludeTeams,
        [bool]$IncludeWaitingIndividuals,
        [bool]$IncludeQualifierSubmissions,
        [bool]$IncludeQualifierScores,
        [bool]$LockQualifierRound,
        [bool]$CalculateQualifier,
        [bool]$ApplyAdvancement,
        [bool]$IncludeFinalSubmissions,
        [bool]$IncludeFinalScores,
        [bool]$LockFinalRound,
        [bool]$PublishFinalResults
    )

    return @{
        FileName = $FileName
        Key = $Key
        Title = $Title
        Description = $Description
        PublishedAt = $PublishedAt
        RegistrationStart = $RegistrationStart
        RegistrationEnd = $RegistrationEnd
        CompetitionStart = $CompetitionStart
        CompetitionEnd = $CompetitionEnd
        QualifierStart = $QualifierStart
        QualifierDeadline = $QualifierDeadline
        QualifierEnd = $QualifierEnd
        FinalStart = $FinalStart
        FinalDeadline = $FinalDeadline
        FinalEnd = $FinalEnd
        EventStatus = $EventStatus
        IncludeTeams = $IncludeTeams
        IncludeWaitingIndividuals = $IncludeWaitingIndividuals
        IncludeQualifierSubmissions = $IncludeQualifierSubmissions
        IncludeQualifierScores = $IncludeQualifierScores
        LockQualifierRound = $LockQualifierRound
        CalculateQualifier = $CalculateQualifier
        ApplyAdvancement = $ApplyAdvancement
        IncludeFinalSubmissions = $IncludeFinalSubmissions
        IncludeFinalScores = $IncludeFinalScores
        LockFinalRound = $LockFinalRound
        PublishFinalResults = $PublishFinalResults
    }
}

function Render-ScenarioSql {
    param(
        [hashtable]$Scenario,
        [array]$TeamSeeds,
        [array]$WaitingSeeds,
        [datetime]$ScenarioNow
    )

    $template = @'
USE SEAL_Hackathon_G06;
GO

SET NOCOUNT ON;

DECLARE @ScenarioKey NVARCHAR(120) = N'__SCENARIO_KEY__';
DECLARE @ScenarioTitle NVARCHAR(180) = N'__SCENARIO_TITLE__';
DECLARE @ScenarioDescription NVARCHAR(500) = N'__SCENARIO_DESCRIPTION__';
DECLARE @ScenarioNow DATETIME2 = '__SCENARIO_NOW__';
DECLARE @PublishedAt DATETIME2 = '__PUBLISHED_AT__';
DECLARE @RegistrationStart DATETIME2 = '__REG_START__';
DECLARE @RegistrationEnd DATETIME2 = '__REG_END__';
DECLARE @CompetitionStart DATETIME2 = '__COMP_START__';
DECLARE @CompetitionEnd DATETIME2 = '__COMP_END__';
DECLARE @QualifierStart DATETIME2 = '__QUAL_START__';
DECLARE @QualifierDeadline DATETIME2 = '__QUAL_DEADLINE__';
DECLARE @QualifierEnd DATETIME2 = '__QUAL_END__';
DECLARE @FinalStart DATETIME2 = '__FINAL_START__';
DECLARE @FinalDeadline DATETIME2 = '__FINAL_DEADLINE__';
DECLARE @FinalEnd DATETIME2 = '__FINAL_END__';
DECLARE @EventStatus VARCHAR(30) = '__EVENT_STATUS__';

DECLARE @IncludeTeams BIT = __INCLUDE_TEAMS__;
DECLARE @IncludeWaitingIndividuals BIT = __INCLUDE_WAITING__;
DECLARE @IncludeQualifierSubmissions BIT = __INCLUDE_QUAL_SUBMISSIONS__;
DECLARE @IncludeQualifierScores BIT = __INCLUDE_QUAL_SCORES__;
DECLARE @LockQualifierRound BIT = __LOCK_QUALIFIER__;
DECLARE @CalculateQualifier BIT = __CALCULATE_QUALIFIER__;
DECLARE @ApplyAdvancement BIT = __APPLY_ADVANCEMENT__;
DECLARE @PublishQualifierResults BIT = @ApplyAdvancement;
DECLARE @IncludeFinalSubmissions BIT = __INCLUDE_FINAL_SUBMISSIONS__;
DECLARE @IncludeFinalScores BIT = __INCLUDE_FINAL_SCORES__;
DECLARE @LockFinalRound BIT = __LOCK_FINAL__;
DECLARE @PublishFinalResults BIT = __PUBLISH_FINAL_RESULTS__;
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
__TEAM_SEED_VALUES__;

DECLARE @WaitingSeed TABLE (
    username VARCHAR(100) NOT NULL,
    track_name NVARCHAR(100) NOT NULL
);

INSERT INTO @WaitingSeed (
    username, track_name
)
VALUES
__WAITING_SEED_VALUES__;

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
'@

    $sql = $template
    $sql = $sql.Replace("__SCENARIO_KEY__", (Escape-SqlString $Scenario.Key))
    $sql = $sql.Replace("__SCENARIO_TITLE__", (Escape-SqlString $Scenario.Title))
    $sql = $sql.Replace("__SCENARIO_DESCRIPTION__", (Escape-SqlString $Scenario.Description))
    $sql = $sql.Replace("__SCENARIO_NOW__", (ConvertTo-SqlDateTime $ScenarioNow))
    $sql = $sql.Replace("__PUBLISHED_AT__", (ConvertTo-SqlDateTime $Scenario.PublishedAt))
    $sql = $sql.Replace("__REG_START__", (ConvertTo-SqlDateTime $Scenario.RegistrationStart))
    $sql = $sql.Replace("__REG_END__", (ConvertTo-SqlDateTime $Scenario.RegistrationEnd))
    $sql = $sql.Replace("__COMP_START__", (ConvertTo-SqlDateTime $Scenario.CompetitionStart))
    $sql = $sql.Replace("__COMP_END__", (ConvertTo-SqlDateTime $Scenario.CompetitionEnd))
    $sql = $sql.Replace("__QUAL_START__", (ConvertTo-SqlDateTime $Scenario.QualifierStart))
    $sql = $sql.Replace("__QUAL_DEADLINE__", (ConvertTo-SqlDateTime $Scenario.QualifierDeadline))
    $sql = $sql.Replace("__QUAL_END__", (ConvertTo-SqlDateTime $Scenario.QualifierEnd))
    $sql = $sql.Replace("__FINAL_START__", (ConvertTo-SqlDateTime $Scenario.FinalStart))
    $sql = $sql.Replace("__FINAL_DEADLINE__", (ConvertTo-SqlDateTime $Scenario.FinalDeadline))
    $sql = $sql.Replace("__FINAL_END__", (ConvertTo-SqlDateTime $Scenario.FinalEnd))
    $sql = $sql.Replace("__EVENT_STATUS__", (Escape-SqlString $Scenario.EventStatus))
    $sql = $sql.Replace("__INCLUDE_TEAMS__", (ConvertTo-SqlBit $Scenario.IncludeTeams))
    $sql = $sql.Replace("__INCLUDE_WAITING__", (ConvertTo-SqlBit $Scenario.IncludeWaitingIndividuals))
    $sql = $sql.Replace("__INCLUDE_QUAL_SUBMISSIONS__", (ConvertTo-SqlBit $Scenario.IncludeQualifierSubmissions))
    $sql = $sql.Replace("__INCLUDE_QUAL_SCORES__", (ConvertTo-SqlBit $Scenario.IncludeQualifierScores))
    $sql = $sql.Replace("__LOCK_QUALIFIER__", (ConvertTo-SqlBit $Scenario.LockQualifierRound))
    $sql = $sql.Replace("__CALCULATE_QUALIFIER__", (ConvertTo-SqlBit $Scenario.CalculateQualifier))
    $sql = $sql.Replace("__APPLY_ADVANCEMENT__", (ConvertTo-SqlBit $Scenario.ApplyAdvancement))
    $sql = $sql.Replace("__INCLUDE_FINAL_SUBMISSIONS__", (ConvertTo-SqlBit $Scenario.IncludeFinalSubmissions))
    $sql = $sql.Replace("__INCLUDE_FINAL_SCORES__", (ConvertTo-SqlBit $Scenario.IncludeFinalScores))
    $sql = $sql.Replace("__LOCK_FINAL__", (ConvertTo-SqlBit $Scenario.LockFinalRound))
    $sql = $sql.Replace("__PUBLISH_FINAL_RESULTS__", (ConvertTo-SqlBit $Scenario.PublishFinalResults))
    $sql = $sql.Replace("__TEAM_SEED_VALUES__", (Render-TeamSeedValues $TeamSeeds))
    $sql = $sql.Replace("__WAITING_SEED_VALUES__", (Render-WaitingSeedValues $WaitingSeeds))

    return $sql
}

function Render-RegistrationClosedTransitionSql {
    param(
        [hashtable]$Scenario,
        [datetime]$ScenarioNow
    )

    return @"
USE SEAL_Hackathon_G06;
GO

SET NOCOUNT ON;

DECLARE @ScenarioKey NVARCHAR(120) = N'$($Scenario.Key)';
DECLARE @ScenarioTitle NVARCHAR(180) = N'$(Escape-SqlString $Scenario.Title)';
DECLARE @ScenarioDescription NVARCHAR(500) = N'$(Escape-SqlString $Scenario.Description)';
DECLARE @ScenarioNow DATETIME2 = '$(ConvertTo-SqlDateTime $ScenarioNow)';
DECLARE @PublishedAt DATETIME2 = '$(ConvertTo-SqlDateTime $Scenario.PublishedAt)';
DECLARE @RegistrationStart DATETIME2 = '$(ConvertTo-SqlDateTime $Scenario.RegistrationStart)';
DECLARE @RegistrationEnd DATETIME2 = '$(ConvertTo-SqlDateTime $Scenario.RegistrationEnd)';
DECLARE @CompetitionStart DATETIME2 = '$(ConvertTo-SqlDateTime $Scenario.CompetitionStart)';
DECLARE @CompetitionEnd DATETIME2 = '$(ConvertTo-SqlDateTime $Scenario.CompetitionEnd)';
DECLARE @QualifierStart DATETIME2 = '$(ConvertTo-SqlDateTime $Scenario.QualifierStart)';
DECLARE @QualifierDeadline DATETIME2 = '$(ConvertTo-SqlDateTime $Scenario.QualifierDeadline)';
DECLARE @QualifierEnd DATETIME2 = '$(ConvertTo-SqlDateTime $Scenario.QualifierEnd)';
DECLARE @FinalStart DATETIME2 = '$(ConvertTo-SqlDateTime $Scenario.FinalStart)';
DECLARE @FinalDeadline DATETIME2 = '$(ConvertTo-SqlDateTime $Scenario.FinalDeadline)';
DECLARE @FinalEnd DATETIME2 = '$(ConvertTo-SqlDateTime $Scenario.FinalEnd)';

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
    status = '$($Scenario.EventStatus)',
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
"@
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$generatedAt = Get-Date
$anchor = Resolve-AnchorDate -Value $AnchorDate

$limitedTeamSeeds = @(
    @{ SortNo = 1; TeamName = "SEAL Coders"; TrackName = "Web Platform"; JoinCode = "SEAL2026"; RepoSlug = "seal-coders"; QualifierScore = "8.91"; FinalScore = "9.18"; AcceptAutoAssignedMembers = $true },
    @{ SortNo = 2; TeamName = "Web Velocity"; TrackName = "Web Platform"; JoinCode = "WEBV1001"; RepoSlug = "web-velocity"; QualifierScore = "8.55"; FinalScore = "8.85"; AcceptAutoAssignedMembers = $false },
    @{ SortNo = 3; TeamName = "Pixel Raiders"; TrackName = "Web Platform"; JoinCode = "WEBV1002"; RepoSlug = "pixel-raiders"; QualifierScore = "8.10"; FinalScore = "8.42"; AcceptAutoAssignedMembers = $false },
    @{ SortNo = 4; TeamName = "Sprint Canvas"; TrackName = "Web Platform"; JoinCode = "WEBV1003"; RepoSlug = "sprint-canvas"; QualifierScore = "7.85"; FinalScore = "8.10"; AcceptAutoAssignedMembers = $false },
    @{ SortNo = 5; TeamName = "Urban Web Crew"; TrackName = "Web Platform"; JoinCode = "WEBV1004"; RepoSlug = "urban-web-crew"; QualifierScore = "7.30"; FinalScore = "7.95"; AcceptAutoAssignedMembers = $false },
    @{ SortNo = 6; TeamName = "AI Pioneers"; TrackName = "AI & Data"; JoinCode = "AIDT1001"; RepoSlug = "ai-pioneers"; QualifierScore = "8.75"; FinalScore = "9.32"; AcceptAutoAssignedMembers = $true },
    @{ SortNo = 7; TeamName = "Neural Forge"; TrackName = "AI & Data"; JoinCode = "AIDT1002"; RepoSlug = "neural-forge"; QualifierScore = "8.40"; FinalScore = "8.78"; AcceptAutoAssignedMembers = $true },
    @{ SortNo = 8; TeamName = "Signal Stack"; TrackName = "AI & Data"; JoinCode = "AIDT1003"; RepoSlug = "signal-stack"; QualifierScore = "7.95"; FinalScore = "8.18"; AcceptAutoAssignedMembers = $false },
    @{ SortNo = 9; TeamName = "Data Vision"; TrackName = "AI & Data"; JoinCode = "AIDT1005"; RepoSlug = "data-vision"; QualifierScore = "7.55"; FinalScore = "7.96"; AcceptAutoAssignedMembers = $false }
)

$fullTeamSeeds = $limitedTeamSeeds + @(
    @{ SortNo = 10; TeamName = "Flow Frontier"; TrackName = "Web Platform"; JoinCode = "WEBV1005"; RepoSlug = "flow-frontier"; QualifierScore = "7.22"; FinalScore = "7.84"; AcceptAutoAssignedMembers = $true },
    @{ SortNo = 11; TeamName = "Interface Union"; TrackName = "Web Platform"; JoinCode = "WEBV1006"; RepoSlug = "interface-union"; QualifierScore = "7.14"; FinalScore = "7.76"; AcceptAutoAssignedMembers = $false },
    @{ SortNo = 12; TeamName = "Portal Pulse"; TrackName = "Web Platform"; JoinCode = "WEBV1007"; RepoSlug = "portal-pulse"; QualifierScore = "7.05"; FinalScore = "7.68"; AcceptAutoAssignedMembers = $true },
    @{ SortNo = 13; TeamName = "Visionary Labs"; TrackName = "AI & Data"; JoinCode = "AIDT1006"; RepoSlug = "visionary-labs"; QualifierScore = "7.42"; FinalScore = "7.90"; AcceptAutoAssignedMembers = $true },
    @{ SortNo = 14; TeamName = "Tensor Titans"; TrackName = "AI & Data"; JoinCode = "AIDT1007"; RepoSlug = "tensor-titans"; QualifierScore = "7.36"; FinalScore = "7.82"; AcceptAutoAssignedMembers = $false },
    @{ SortNo = 15; TeamName = "Model Mavericks"; TrackName = "AI & Data"; JoinCode = "AIDT1008"; RepoSlug = "model-mavericks"; QualifierScore = "7.28"; FinalScore = "7.73"; AcceptAutoAssignedMembers = $true },
    @{ SortNo = 16; TeamName = "Insight Ops"; TrackName = "AI & Data"; JoinCode = "AIDT1009"; RepoSlug = "insight-ops"; QualifierScore = "7.12"; FinalScore = "7.65"; AcceptAutoAssignedMembers = $false }
)

$waitingSeeds = @(
    @{ Username = "huy.student"; TrackName = "Web Platform" },
    @{ Username = "minh.student"; TrackName = "Web Platform" },
    @{ Username = "dat.student"; TrackName = "AI & Data" }
)

$scenarios = @(
    (New-Scenario `
        -FileName "00_base_system_clean.sql" `
        -Key "base_system_clean" `
        -Title "Base system clean" `
        -Description "Lifecycle demo: Summer 2026 exists with no teams, no registrations, and no submissions yet." `
        -PublishedAt $anchor.AddDays(-1) `
        -RegistrationStart $anchor.AddDays(2) `
        -RegistrationEnd $anchor.AddDays(9) `
        -CompetitionStart $anchor.AddDays(12) `
        -CompetitionEnd $anchor.AddDays(40) `
        -QualifierStart $anchor.AddDays(12) `
        -QualifierDeadline $anchor.AddDays(18) `
        -QualifierEnd $anchor.AddDays(20) `
        -FinalStart $anchor.AddDays(28) `
        -FinalDeadline $anchor.AddDays(32) `
        -FinalEnd $anchor.AddDays(34) `
        -EventStatus "Ongoing" `
        -IncludeTeams $false `
        -IncludeWaitingIndividuals $false `
        -IncludeQualifierSubmissions $false `
        -IncludeQualifierScores $false `
        -LockQualifierRound $false `
        -CalculateQualifier $false `
        -ApplyAdvancement $false `
        -IncludeFinalSubmissions $false `
        -IncludeFinalScores $false `
        -LockFinalRound $false `
        -PublishFinalResults $false),
    (New-Scenario `
        -FileName "01_registration_open.sql" `
        -Key "registration_open" `
        -Title "Registration open" `
        -Description "Lifecycle demo: Summer 2026 registration is open, teams already exist, no submission has been made yet, and individual registration is left empty for manual testing." `
        -PublishedAt $anchor.AddDays(-5) `
        -RegistrationStart $anchor.AddDays(-2) `
        -RegistrationEnd $anchor.AddDays(5) `
        -CompetitionStart $anchor.AddDays(7) `
        -CompetitionEnd $anchor.AddDays(35) `
        -QualifierStart $anchor.AddDays(7) `
        -QualifierDeadline $anchor.AddDays(12) `
        -QualifierEnd $anchor.AddDays(14) `
        -FinalStart $anchor.AddDays(24) `
        -FinalDeadline $anchor.AddDays(28) `
        -FinalEnd $anchor.AddDays(30) `
        -EventStatus "Ongoing" `
        -IncludeTeams $true `
        -IncludeWaitingIndividuals $false `
        -IncludeQualifierSubmissions $false `
        -IncludeQualifierScores $false `
        -LockQualifierRound $false `
        -CalculateQualifier $false `
        -ApplyAdvancement $false `
        -IncludeFinalSubmissions $false `
        -IncludeFinalScores $false `
        -LockFinalRound $false `
        -PublishFinalResults $false),
    (New-Scenario `
        -FileName "02_registration_closed.sql" `
        -Key "registration_closed" `
        -Title "Registration closed" `
        -Description "Lifecycle demo: Summer 2026 registration is closed, the qualifier has not opened yet, and there are still no submissions." `
        -PublishedAt $anchor.AddDays(-12) `
        -RegistrationStart $anchor.AddDays(-10) `
        -RegistrationEnd $anchor.AddDays(-1) `
        -CompetitionStart $anchor.AddDays(1) `
        -CompetitionEnd $anchor.AddDays(28) `
        -QualifierStart $anchor.AddDays(1) `
        -QualifierDeadline $anchor.AddDays(6) `
        -QualifierEnd $anchor.AddDays(8) `
        -FinalStart $anchor.AddDays(18) `
        -FinalDeadline $anchor.AddDays(22) `
        -FinalEnd $anchor.AddDays(24) `
        -EventStatus "Ongoing" `
        -IncludeTeams $true `
        -IncludeWaitingIndividuals $false `
        -IncludeQualifierSubmissions $false `
        -IncludeQualifierScores $false `
        -LockQualifierRound $false `
        -CalculateQualifier $false `
        -ApplyAdvancement $false `
        -IncludeFinalSubmissions $false `
        -IncludeFinalScores $false `
        -LockFinalRound $false `
        -PublishFinalResults $false),
    (New-Scenario `
        -FileName "03_qualifier_submission_open.sql" `
        -Key "qualifier_submission_open" `
        -Title "Qualifier submission open" `
        -Description "Lifecycle demo: Registration is closed, the qualifier is open for submission, and no team has submitted yet." `
        -PublishedAt $anchor.AddDays(-14) `
        -RegistrationStart $anchor.AddDays(-12) `
        -RegistrationEnd $anchor.AddDays(-2) `
        -CompetitionStart $anchor.AddDays(-1) `
        -CompetitionEnd $anchor.AddDays(24) `
        -QualifierStart $anchor.AddDays(-1) `
        -QualifierDeadline $anchor.AddDays(3) `
        -QualifierEnd $anchor.AddDays(5) `
        -FinalStart $anchor.AddDays(15) `
        -FinalDeadline $anchor.AddDays(19) `
        -FinalEnd $anchor.AddDays(21) `
        -EventStatus "Ongoing" `
        -IncludeTeams $true `
        -IncludeWaitingIndividuals $false `
        -IncludeQualifierSubmissions $false `
        -IncludeQualifierScores $false `
        -LockQualifierRound $false `
        -CalculateQualifier $false `
        -ApplyAdvancement $false `
        -IncludeFinalSubmissions $false `
        -IncludeFinalScores $false `
        -LockFinalRound $false `
        -PublishFinalResults $false),
    (New-Scenario `
        -FileName "04_qualifier_submission_closed_scoring_open.sql" `
        -Key "qualifier_submission_closed_scoring_open" `
        -Title "Qualifier submission closed scoring open" `
        -Description "Lifecycle demo: Qualifier submission is closed, all teams have submitted, and judge scoring has not started yet." `
        -PublishedAt $anchor.AddDays(-20) `
        -RegistrationStart $anchor.AddDays(-18) `
        -RegistrationEnd $anchor.AddDays(-10) `
        -CompetitionStart $anchor.AddDays(-8) `
        -CompetitionEnd $anchor.AddDays(18) `
        -QualifierStart $anchor.AddDays(-8) `
        -QualifierDeadline $anchor.AddDays(-1) `
        -QualifierEnd $anchor.AddDays(2) `
        -FinalStart $anchor.AddDays(12) `
        -FinalDeadline $anchor.AddDays(16) `
        -FinalEnd $anchor.AddDays(18) `
        -EventStatus "Ongoing" `
        -IncludeTeams $true `
        -IncludeWaitingIndividuals $false `
        -IncludeQualifierSubmissions $true `
        -IncludeQualifierScores $false `
        -LockQualifierRound $false `
        -CalculateQualifier $false `
        -ApplyAdvancement $false `
        -IncludeFinalSubmissions $false `
        -IncludeFinalScores $false `
        -LockFinalRound $false `
        -PublishFinalResults $false),
    (New-Scenario `
        -FileName "05_qualifier_scoring_closed_ready_for_finalize.sql" `
        -Key "qualifier_scoring_closed_ready_for_finalize" `
        -Title "Qualifier scoring closed ready for finalize" `
        -Description "Lifecycle demo: Qualifier scoring time is over, all qualifier submissions already have scores, and the coordinator can finalize then promote teams." `
        -PublishedAt $anchor.AddDays(-24) `
        -RegistrationStart $anchor.AddDays(-22) `
        -RegistrationEnd $anchor.AddDays(-14) `
        -CompetitionStart $anchor.AddDays(-12) `
        -CompetitionEnd $anchor.AddDays(14) `
        -QualifierStart $anchor.AddDays(-12) `
        -QualifierDeadline $anchor.AddDays(-4) `
        -QualifierEnd $anchor.AddDays(-1) `
        -FinalStart $anchor.AddDays(8) `
        -FinalDeadline $anchor.AddDays(12) `
        -FinalEnd $anchor.AddDays(14) `
        -EventStatus "Ongoing" `
        -IncludeTeams $true `
        -IncludeWaitingIndividuals $false `
        -IncludeQualifierSubmissions $true `
        -IncludeQualifierScores $true `
        -LockQualifierRound $false `
        -CalculateQualifier $false `
        -ApplyAdvancement $false `
        -IncludeFinalSubmissions $false `
        -IncludeFinalScores $false `
        -LockFinalRound $false `
        -PublishFinalResults $false),
    (New-Scenario `
        -FileName "06_final_round_open.sql" `
        -Key "final_round_open" `
        -Title "Final round open" `
        -Description "Lifecycle demo: Qualifier is finalized, promoted, and published; the final round is open and finalists have not submitted yet." `
        -PublishedAt $anchor.AddDays(-30) `
        -RegistrationStart $anchor.AddDays(-28) `
        -RegistrationEnd $anchor.AddDays(-20) `
        -CompetitionStart $anchor.AddDays(-18) `
        -CompetitionEnd $anchor.AddDays(10) `
        -QualifierStart $anchor.AddDays(-18) `
        -QualifierDeadline $anchor.AddDays(-11) `
        -QualifierEnd $anchor.AddDays(-8) `
        -FinalStart $anchor.AddDays(-1) `
        -FinalDeadline $anchor.AddDays(3) `
        -FinalEnd $anchor.AddDays(5) `
        -EventStatus "Ongoing" `
        -IncludeTeams $true `
        -IncludeWaitingIndividuals $false `
        -IncludeQualifierSubmissions $true `
        -IncludeQualifierScores $true `
        -LockQualifierRound $true `
        -CalculateQualifier $true `
        -ApplyAdvancement $true `
        -IncludeFinalSubmissions $false `
        -IncludeFinalScores $false `
        -LockFinalRound $false `
        -PublishFinalResults $false),
    (New-Scenario `
        -FileName "07_final_submission_closed_scoring_open.sql" `
        -Key "final_submission_closed_scoring_open" `
        -Title "Final submission closed scoring open" `
        -Description "Lifecycle demo: Final submission is closed, finalists have submitted, and final scoring has not started yet." `
        -PublishedAt $anchor.AddDays(-34) `
        -RegistrationStart $anchor.AddDays(-32) `
        -RegistrationEnd $anchor.AddDays(-24) `
        -CompetitionStart $anchor.AddDays(-22) `
        -CompetitionEnd $anchor.AddDays(7) `
        -QualifierStart $anchor.AddDays(-22) `
        -QualifierDeadline $anchor.AddDays(-15) `
        -QualifierEnd $anchor.AddDays(-12) `
        -FinalStart $anchor.AddDays(-5) `
        -FinalDeadline $anchor.AddDays(-1) `
        -FinalEnd $anchor.AddDays(2) `
        -EventStatus "Ongoing" `
        -IncludeTeams $true `
        -IncludeWaitingIndividuals $false `
        -IncludeQualifierSubmissions $true `
        -IncludeQualifierScores $true `
        -LockQualifierRound $true `
        -CalculateQualifier $true `
        -ApplyAdvancement $true `
        -IncludeFinalSubmissions $true `
        -IncludeFinalScores $false `
        -LockFinalRound $false `
        -PublishFinalResults $false),
    (New-Scenario `
        -FileName "08_final_scoring_closed_ready_to_publish.sql" `
        -Key "final_scoring_closed_ready_to_publish" `
        -Title "Final scoring closed ready to publish" `
        -Description "Lifecycle demo: Final scoring time is over, final submissions already have scores, and the coordinator can finalize then publish results." `
        -PublishedAt $anchor.AddDays(-38) `
        -RegistrationStart $anchor.AddDays(-36) `
        -RegistrationEnd $anchor.AddDays(-28) `
        -CompetitionStart $anchor.AddDays(-26) `
        -CompetitionEnd $anchor.AddDays(4) `
        -QualifierStart $anchor.AddDays(-26) `
        -QualifierDeadline $anchor.AddDays(-19) `
        -QualifierEnd $anchor.AddDays(-16) `
        -FinalStart $anchor.AddDays(-7) `
        -FinalDeadline $anchor.AddDays(-3) `
        -FinalEnd $anchor.AddDays(-1) `
        -EventStatus "Ongoing" `
        -IncludeTeams $true `
        -IncludeWaitingIndividuals $false `
        -IncludeQualifierSubmissions $true `
        -IncludeQualifierScores $true `
        -LockQualifierRound $true `
        -CalculateQualifier $true `
        -ApplyAdvancement $true `
        -IncludeFinalSubmissions $true `
        -IncludeFinalScores $true `
        -LockFinalRound $false `
        -PublishFinalResults $false),
    (New-Scenario `
        -FileName "09_event_ended_full_results.sql" `
        -Key "event_ended_full_results" `
        -Title "Event ended full results" `
        -Description "Lifecycle demo: Summer 2026 is fully completed with submissions, scores, rankings, awards, and no further participation allowed." `
        -PublishedAt $anchor.AddDays(-45) `
        -RegistrationStart $anchor.AddDays(-43) `
        -RegistrationEnd $anchor.AddDays(-35) `
        -CompetitionStart $anchor.AddDays(-33) `
        -CompetitionEnd $anchor.AddDays(-1) `
        -QualifierStart $anchor.AddDays(-33) `
        -QualifierDeadline $anchor.AddDays(-26) `
        -QualifierEnd $anchor.AddDays(-23) `
        -FinalStart $anchor.AddDays(-14) `
        -FinalDeadline $anchor.AddDays(-10) `
        -FinalEnd $anchor.AddDays(-7) `
        -EventStatus "Ended" `
        -IncludeTeams $true `
        -IncludeWaitingIndividuals $false `
        -IncludeQualifierSubmissions $true `
        -IncludeQualifierScores $true `
        -LockQualifierRound $true `
        -CalculateQualifier $true `
        -ApplyAdvancement $true `
        -IncludeFinalSubmissions $true `
        -IncludeFinalScores $true `
        -LockFinalRound $true `
        -PublishFinalResults $true)
)

foreach ($scenario in $scenarios) {
    $scenarioTeamSeeds = if ($scenario.Key -in @("registration_open", "registration_closed")) {
        $limitedTeamSeeds
    } else {
        $fullTeamSeeds
    }

    $sql = if ($scenario.Key -eq "registration_closed") {
        Render-RegistrationClosedTransitionSql -Scenario $scenario -ScenarioNow $anchor
    } else {
        Render-ScenarioSql -Scenario $scenario -TeamSeeds $scenarioTeamSeeds -WaitingSeeds $waitingSeeds -ScenarioNow $anchor
    }
    $targetPath = Join-Path $scriptDirectory $scenario.FileName
    Set-Content -Path $targetPath -Value $sql -Encoding UTF8
    Write-Host ("Generated {0}" -f $targetPath)
}

Write-Host ("Generated {0} lifecycle SQL scenario files with anchor {1} at {2}" -f `
    $scenarios.Count, `
    $anchor.ToString("yyyy-MM-dd HH:mm:ss"), `
    $generatedAt.ToString("yyyy-MM-dd HH:mm:ss"))
