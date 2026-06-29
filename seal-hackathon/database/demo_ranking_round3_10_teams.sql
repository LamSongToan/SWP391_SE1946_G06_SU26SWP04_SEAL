SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
SET NOCOUNT ON;

DECLARE @RoundId INT = 3;
DECLARE @Criteria1 INT = 1;
DECLARE @Criteria2 INT = 2;
DECLARE @Criteria3 INT = 3;
DECLARE @TrackWeb INT = 3;
DECLARE @TrackAi INT = 4;
DECLARE @WebJudge1 INT = 3;
DECLARE @WebJudge2 INT = 4;
DECLARE @AiJudge1 INT = 5;
DECLARE @AiJudge2 INT = 6;
DECLARE @Now DATETIME = GETDATE();
DECLARE @PasswordHash VARCHAR(255) = (SELECT TOP 1 password_hash FROM Users ORDER BY user_id);

DECLARE @DemoTeams TABLE (
    team_name NVARCHAR(100),
    track_id INT,
    join_code VARCHAR(20),
    repo_slug VARCHAR(120),
    score_value DECIMAL(4,2)
);

INSERT INTO @DemoTeams (team_name, track_id, join_code, repo_slug, score_value)
VALUES
    (N'Web Velocity', 3, 'WEBV1001', 'web-velocity', 8.55),
    (N'Pixel Raiders', 3, 'WEBV1002', 'pixel-raiders', 8.10),
    (N'Sprint Canvas', 3, 'WEBV1003', 'sprint-canvas', 7.85),
    (N'Neural Forge', 4, 'AIDT1001', 'neural-forge', 8.40),
    (N'Signal Stack', 4, 'AIDT1002', 'signal-stack', 7.95),
    (N'Insight Loop', 4, 'AIDT1003', 'insight-loop', 7.65);

DECLARE
    @TeamName NVARCHAR(100),
    @TrackId INT,
    @JoinCode VARCHAR(20),
    @RepoSlug VARCHAR(120),
    @ScoreValue DECIMAL(4,2),
    @TeamId INT,
    @SubmissionId INT,
    @JudgeAssignment1 INT,
    @JudgeAssignment2 INT,
    @MemberIndex INT,
    @Username VARCHAR(100),
    @Email VARCHAR(150),
    @FullName NVARCHAR(150),
    @UserId INT,
    @UserRoleId INT,
    @LeaderRoleId INT,
    @StudentCode VARCHAR(30);

DECLARE @MemberRoles TABLE (
    slot_no INT PRIMARY KEY,
    user_role_id INT NOT NULL
);

DECLARE demo_cursor CURSOR FAST_FORWARD FOR
SELECT team_name, track_id, join_code, repo_slug, score_value
FROM @DemoTeams;

OPEN demo_cursor;
FETCH NEXT FROM demo_cursor INTO @TeamName, @TrackId, @JoinCode, @RepoSlug, @ScoreValue;

WHILE @@FETCH_STATUS = 0
BEGIN
    DELETE FROM @MemberRoles;
    SET @TeamId = NULL;
    SET @SubmissionId = NULL;
    SET @LeaderRoleId = NULL;
    SET @MemberIndex = 1;

    WHILE @MemberIndex <= 3
    BEGIN
        SET @UserId = NULL;
        SET @UserRoleId = NULL;
        SET @Username = CONCAT('demo.', @RepoSlug, '.', @MemberIndex);
        SET @Email = CONCAT(@RepoSlug, '.', @MemberIndex, '@seal.demo.local');
        SET @FullName = CONCAT(@TeamName, N' Member ', @MemberIndex);
        SET @StudentCode = CONCAT('DM', RIGHT(CONCAT('0000', ABS(CHECKSUM(@RepoSlug)) % 10000), 4), @MemberIndex);

        SELECT @UserId = user_id
        FROM Users
        WHERE email = @Email;

        IF @UserId IS NULL
        BEGIN
            INSERT INTO Users (
                username,
                email,
                password_hash,
                full_name,
                avatar_url,
                bio,
                profile_links,
                rejection_reason,
                status,
                is_approved,
                must_change_password,
                created_at
            )
            VALUES (
                @Username,
                @Email,
                @PasswordHash,
                @FullName,
                NULL,
                CONCAT('Demo member for ', @TeamName),
                NULL,
                NULL,
                'Active',
                1,
                0,
                @Now
            );

            SET @UserId = SCOPE_IDENTITY();
        END;

        SELECT @UserRoleId = user_role_id
        FROM UserRole
        WHERE user_id = @UserId
          AND role_type = 'Student';

        IF @UserRoleId IS NULL
        BEGIN
            INSERT INTO UserRole (user_id, role_type)
            VALUES (@UserId, 'Student');

            SET @UserRoleId = SCOPE_IDENTITY();
        END;

        IF NOT EXISTS (SELECT 1 FROM StudentProfile WHERE user_role_id = @UserRoleId)
        BEGIN
            INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
            VALUES (@UserRoleId, 'FPT', @StudentCode, N'FPT University HCMC');
        END;

        INSERT INTO @MemberRoles (slot_no, user_role_id)
        VALUES (@MemberIndex, @UserRoleId);

        IF @MemberIndex = 1
        BEGIN
            SET @LeaderRoleId = @UserRoleId;
        END;

        SET @MemberIndex += 1;
    END;

    SELECT @TeamId = team_id
    FROM Team
    WHERE team_name = @TeamName;

    IF @TeamId IS NULL
    BEGIN
        INSERT INTO Team (track_id, user_role_id, team_name, join_code, status, created_at)
        VALUES (@TrackId, @LeaderRoleId, @TeamName, @JoinCode, 'Ready', @Now);

        SET @TeamId = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE Team
        SET track_id = @TrackId,
            user_role_id = @LeaderRoleId,
            join_code = @JoinCode,
            status = 'Ready'
        WHERE team_id = @TeamId;
    END;

    DECLARE member_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT user_role_id
    FROM @MemberRoles
    ORDER BY slot_no;

    OPEN member_cursor;
    FETCH NEXT FROM member_cursor INTO @UserRoleId;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM TeamMember tm
            WHERE tm.team_id = @TeamId
              AND tm.user_role_id = @UserRoleId
        )
        BEGIN
            INSERT INTO TeamMember (team_id, user_role_id, joined_at)
            VALUES (@TeamId, @UserRoleId, @Now);
        END;

        FETCH NEXT FROM member_cursor INTO @UserRoleId;
    END;

    CLOSE member_cursor;
    DEALLOCATE member_cursor;

    SELECT @SubmissionId = submission_id
    FROM Submission
    WHERE team_id = @TeamId
      AND round_id = @RoundId;

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
            @RoundId,
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
    END;

    IF @TrackId = @TrackWeb
    BEGIN
        SET @JudgeAssignment1 = @WebJudge1;
        SET @JudgeAssignment2 = @WebJudge2;
    END
    ELSE
    BEGIN
        SET @JudgeAssignment1 = @AiJudge1;
        SET @JudgeAssignment2 = @AiJudge2;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM JudgeEvaluation
        WHERE submission_id = @SubmissionId
          AND judge_assignment_id = @JudgeAssignment1
    )
    BEGIN
        INSERT INTO JudgeEvaluation (submission_id, judge_assignment_id, status, finalized_at)
        VALUES (@SubmissionId, @JudgeAssignment1, 'Finalized', @Now);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM JudgeEvaluation
        WHERE submission_id = @SubmissionId
          AND judge_assignment_id = @JudgeAssignment2
    )
    BEGIN
        INSERT INTO JudgeEvaluation (submission_id, judge_assignment_id, status, finalized_at)
        VALUES (@SubmissionId, @JudgeAssignment2, 'Finalized', @Now);
    END;

    IF NOT EXISTS (SELECT 1 FROM Score WHERE submission_id = @SubmissionId AND judge_assignment_id = @JudgeAssignment1 AND criteria_id = @Criteria1)
        INSERT INTO Score (submission_id, judge_assignment_id, criteria_id, score_value, comment)
        VALUES (@SubmissionId, @JudgeAssignment1, @Criteria1, @ScoreValue, CONCAT('Demo score for ', @TeamName));

    IF NOT EXISTS (SELECT 1 FROM Score WHERE submission_id = @SubmissionId AND judge_assignment_id = @JudgeAssignment1 AND criteria_id = @Criteria2)
        INSERT INTO Score (submission_id, judge_assignment_id, criteria_id, score_value, comment)
        VALUES (@SubmissionId, @JudgeAssignment1, @Criteria2, @ScoreValue, CONCAT('Demo score for ', @TeamName));

    IF NOT EXISTS (SELECT 1 FROM Score WHERE submission_id = @SubmissionId AND judge_assignment_id = @JudgeAssignment1 AND criteria_id = @Criteria3)
        INSERT INTO Score (submission_id, judge_assignment_id, criteria_id, score_value, comment)
        VALUES (@SubmissionId, @JudgeAssignment1, @Criteria3, @ScoreValue, CONCAT('Demo score for ', @TeamName));

    IF NOT EXISTS (SELECT 1 FROM Score WHERE submission_id = @SubmissionId AND judge_assignment_id = @JudgeAssignment2 AND criteria_id = @Criteria1)
        INSERT INTO Score (submission_id, judge_assignment_id, criteria_id, score_value, comment)
        VALUES (@SubmissionId, @JudgeAssignment2, @Criteria1, @ScoreValue, CONCAT('Demo score for ', @TeamName));

    IF NOT EXISTS (SELECT 1 FROM Score WHERE submission_id = @SubmissionId AND judge_assignment_id = @JudgeAssignment2 AND criteria_id = @Criteria2)
        INSERT INTO Score (submission_id, judge_assignment_id, criteria_id, score_value, comment)
        VALUES (@SubmissionId, @JudgeAssignment2, @Criteria2, @ScoreValue, CONCAT('Demo score for ', @TeamName));

    IF NOT EXISTS (SELECT 1 FROM Score WHERE submission_id = @SubmissionId AND judge_assignment_id = @JudgeAssignment2 AND criteria_id = @Criteria3)
        INSERT INTO Score (submission_id, judge_assignment_id, criteria_id, score_value, comment)
        VALUES (@SubmissionId, @JudgeAssignment2, @Criteria3, @ScoreValue, CONCAT('Demo score for ', @TeamName));

    FETCH NEXT FROM demo_cursor INTO @TeamName, @TrackId, @JoinCode, @RepoSlug, @ScoreValue;
END;

CLOSE demo_cursor;
DEALLOCATE demo_cursor;
