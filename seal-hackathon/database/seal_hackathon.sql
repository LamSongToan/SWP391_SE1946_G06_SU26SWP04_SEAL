IF EXISTS (
    SELECT name 
    FROM sys.databases 
    WHERE name = 'SEAL_Hackathon_G06'
)
BEGIN
    ALTER DATABASE SEAL_Hackathon_G06 
    SET SINGLE_USER WITH ROLLBACK IMMEDIATE;

    DROP DATABASE SEAL_Hackathon_G06;
END
GO

CREATE DATABASE SEAL_Hackathon_G06;
GO

USE SEAL_Hackathon_G06;
GO

-- =======================================================
-- 1. CENTRAL IDENTITY & ROLE TABLES
-- =======================================================
CREATE TABLE [Users] (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name NVARCHAR(150) NOT NULL,
    avatar_url VARCHAR(500) NULL,
    bio NVARCHAR(500) NULL,
    rejection_reason NVARCHAR(1000) NULL,
    status VARCHAR(50) DEFAULT 'PendingApproval',
    CHECK (status IN ('PendingApproval', 'Active', 'Rejected', 'Suspended')),
    is_approved BIT DEFAULT 0,
    must_change_password BIT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE UserRole (
    user_role_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    role_type VARCHAR(50) NOT NULL, 
    CHECK (role_type IN ('Student', 'Mentor', 'Judge', 'Coordinator')),
    FOREIGN KEY (user_id) REFERENCES [Users](user_id) ON DELETE CASCADE
);

CREATE TABLE TokenBlacklist (
    id INT IDENTITY(1,1) PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE PasswordResetToken (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES [Users](user_id) ON DELETE CASCADE
);

CREATE TABLE RegistrationOtp (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

-- =======================================================
-- 2. CORE SUB-PROFILES (Reusing user_role_id as PK & FK)
-- =======================================================
CREATE TABLE StudentProfile (
    user_role_id INT PRIMARY KEY,
    student_type VARCHAR(50) NOT NULL, -- 'FPT' or 'External'
    student_code VARCHAR(50) NULL,
    university_name NVARCHAR(150) NOT NULL,
    FOREIGN KEY (user_role_id) REFERENCES UserRole(user_role_id) ON DELETE NO ACTION
);

CREATE UNIQUE INDEX UX_StudentProfile_University_StudentCode
ON StudentProfile(university_name, student_code)
WHERE student_code IS NOT NULL;

CREATE TABLE MentorProfile (
    user_role_id INT PRIMARY KEY,
    department NVARCHAR(100),
    specialization NVARCHAR(100),
    FOREIGN KEY (user_role_id) REFERENCES UserRole(user_role_id) ON DELETE NO ACTION
);

CREATE TABLE JudgeProfile (
    user_role_id INT PRIMARY KEY,
    judge_type VARCHAR(50) NOT NULL, -- 'Internal' or 'Guest'
    organization NVARCHAR(150),
    account_expiry DATETIME NULL,
    FOREIGN KEY (user_role_id) REFERENCES UserRole(user_role_id) ON DELETE NO ACTION
);

CREATE TABLE CoordinatorProfile (
    user_role_id INT PRIMARY KEY,
    staff_type VARCHAR(50) NOT NULL, -- 'SE Dept' or 'PDP Staff'
    FOREIGN KEY (user_role_id) REFERENCES UserRole(user_role_id) ON DELETE NO ACTION
);

-- =======================================================
-- 3. HACKATHON STRUCTURE TABLES
-- =======================================================
CREATE TABLE HackathonEvent (
    event_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(150) NOT NULL,
    semester VARCHAR(20) NOT NULL, -- 'Spring', 'Summer', 'Fall'
    year INT NOT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    registration_start_at DATETIME NULL,
    registration_end_at DATETIME NULL,
    competition_start_at DATETIME NULL,
    competition_end_at DATETIME NULL,
    track_selection_mode VARCHAR(30) NULL,
    ranking_method VARCHAR(50) NULL,
    awards_json NVARCHAR(MAX) NULL,
    scoring_criteria_json NVARCHAR(MAX) NULL,
    published_at DATETIME NULL,
    status VARCHAR(50) DEFAULT 'Draft',
    description NVARCHAR(MAX),
    CONSTRAINT CK_HackathonEvent_Status_BusinessRule
        CHECK (status IN ('Draft', 'Ongoing', 'Ended')),
    CONSTRAINT UQ_HackathonEvent_Year_Semester UNIQUE (year, semester)
);

CREATE TABLE Track (
    track_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL, 
    FOREIGN KEY (event_id) REFERENCES HackathonEvent(event_id) ON DELETE CASCADE,
    CONSTRAINT UQ_Track_Event_Name UNIQUE (event_id, name)
);

CREATE TABLE Round (
    round_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL,
    round_name NVARCHAR(100) NOT NULL, -- 'Elimination', 'Finals'
    round_order INT NOT NULL,
    start_at DATETIME NULL,
    end_at DATETIME NULL,
    submission_deadline DATETIME NULL,
    promotion_rule_top_n INT NULL,
    is_final BIT NOT NULL DEFAULT 0,
    score_locked BIT NOT NULL DEFAULT 0,
    FOREIGN KEY (event_id) REFERENCES HackathonEvent(event_id) ON DELETE CASCADE,
    CONSTRAINT UQ_Round_Event_Order UNIQUE (event_id, round_order)
);

CREATE TABLE ScoringCriteria (
    criteria_id INT IDENTITY(1,1) PRIMARY KEY,
    round_id INT NOT NULL,
    criteria_name NVARCHAR(150) NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    criteria_type VARCHAR(50) NOT NULL, 
    FOREIGN KEY (round_id) REFERENCES Round(round_id) ON DELETE CASCADE
);

-- =======================================================
-- 4. TEAMS, MEMBERS & ASSIGNMENTS
-- =======================================================
CREATE TABLE Team (
    team_id INT IDENTITY(1,1) PRIMARY KEY,
    track_id INT NULL,
    user_role_id INT NOT NULL, -- TEAM LEADER
    team_name NVARCHAR(100) NOT NULL,
    join_code VARCHAR(12) NOT NULL UNIQUE
        DEFAULT UPPER(LEFT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 8)),
    status VARCHAR(50) DEFAULT 'Forming',
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (track_id) REFERENCES Track(track_id) ON DELETE CASCADE,
    FOREIGN KEY (user_role_id) REFERENCES StudentProfile(user_role_id) ON DELETE NO ACTION
);

CREATE TABLE TeamMember (
    team_id INT NOT NULL,
    user_role_id INT NOT NULL,
    joined_at DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (team_id, user_role_id),
    FOREIGN KEY (team_id) REFERENCES Team(team_id) ON DELETE NO ACTION,
    FOREIGN KEY (user_role_id) REFERENCES StudentProfile(user_role_id) ON DELETE NO ACTION
);

CREATE TABLE TeamInvitation (
    invitation_id INT IDENTITY(1,1) PRIMARY KEY,
    team_id INT NOT NULL,
    invitee_user_role_id INT NOT NULL,
    invited_by_user_role_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    created_at DATETIME DEFAULT GETDATE(),
    responded_at DATETIME NULL,
    CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Cancelled')),
    FOREIGN KEY (team_id) REFERENCES Team(team_id) ON DELETE CASCADE,
    FOREIGN KEY (invitee_user_role_id) REFERENCES StudentProfile(user_role_id) ON DELETE NO ACTION,
    FOREIGN KEY (invited_by_user_role_id) REFERENCES StudentProfile(user_role_id) ON DELETE NO ACTION
);

CREATE TABLE TrackMentor (
    track_mentor_id INT IDENTITY(1,1) PRIMARY KEY,
    track_id INT NOT NULL,
    user_role_id INT NOT NULL, 
    assigned_at DATETIME DEFAULT GETDATE(),
    UNIQUE(track_id, user_role_id),
    FOREIGN KEY (track_id) REFERENCES Track(track_id) ON DELETE CASCADE,
    FOREIGN KEY (user_role_id) REFERENCES MentorProfile(user_role_id) ON DELETE NO ACTION
);

CREATE TABLE JudgeAssignment (
    judge_assignment_id INT IDENTITY(1,1) PRIMARY KEY,
    round_id INT NOT NULL,
    track_id INT NOT NULL,
    user_role_id INT NOT NULL, 
    assigned_at DATETIME DEFAULT GETDATE(),
    UNIQUE(round_id, track_id, user_role_id),
    FOREIGN KEY (round_id) REFERENCES Round(round_id) ON DELETE NO ACTION,
    FOREIGN KEY (track_id) REFERENCES Track(track_id) ON DELETE NO ACTION,
    FOREIGN KEY (user_role_id) REFERENCES JudgeProfile(user_role_id) ON DELETE NO ACTION
);

CREATE TABLE EventCoordinatorAssignment (
    coordinator_assignment_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL,
    user_role_id INT NOT NULL, 
    assigned_at DATETIME DEFAULT GETDATE(),
    UNIQUE(event_id, user_role_id),
    FOREIGN KEY (event_id) REFERENCES HackathonEvent(event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_role_id) REFERENCES CoordinatorProfile(user_role_id) ON DELETE NO ACTION
);
GO

-- =======================================================
-- 5. SUBMISSIONS, SCORING & RESEARCH (RBL)
-- =======================================================
CREATE TABLE Submission (
    submission_id INT IDENTITY(1,1) PRIMARY KEY,
    team_id INT NOT NULL,
    round_id INT NOT NULL,
    repository_url VARCHAR(1000) NOT NULL,
    demo_url VARCHAR(1000),
    slide_url VARCHAR(1000),
    github_metadata NVARCHAR(MAX), 
    is_calibration BIT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Submitted',
    CHECK (status IN ('Submitted', 'Evaluating', 'Qualified', 'Eliminated')),
    submitted_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    submitted_by_user_role_id INT NULL,
    UNIQUE(team_id, round_id),
    FOREIGN KEY (team_id) REFERENCES Team(team_id) ON DELETE NO ACTION,
    FOREIGN KEY (round_id) REFERENCES Round(round_id) ON DELETE NO ACTION,
    FOREIGN KEY (submitted_by_user_role_id) REFERENCES StudentProfile(user_role_id) ON DELETE NO ACTION
);

CREATE TABLE SubmissionHistory (
    history_id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL,
    changed_by_user_role_id INT NULL,
    action_type VARCHAR(50) NOT NULL,
    old_repository_url VARCHAR(1000),
    new_repository_url VARCHAR(1000),
    old_demo_url VARCHAR(1000),
    new_demo_url VARCHAR(1000),
    old_slide_url VARCHAR(1000),
    new_slide_url VARCHAR(1000),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (submission_id) REFERENCES Submission(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by_user_role_id) REFERENCES StudentProfile(user_role_id) ON DELETE NO ACTION
);

CREATE TABLE Score (
    score_id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL,
    criteria_id INT NOT NULL,
    judge_assignment_id INT NOT NULL, 
    score_value DECIMAL(5,2) NOT NULL,
    comment NVARCHAR(MAX),
    scored_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_Score_Submission_Criteria_Judge UNIQUE (submission_id, criteria_id, judge_assignment_id),
    FOREIGN KEY (submission_id) REFERENCES Submission(submission_id) ON DELETE NO ACTION,
    FOREIGN KEY (criteria_id) REFERENCES ScoringCriteria(criteria_id) ON DELETE NO ACTION,
    FOREIGN KEY (judge_assignment_id) REFERENCES JudgeAssignment(judge_assignment_id) ON DELETE NO ACTION
);

CREATE TABLE JudgeEvaluation (
    evaluation_id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL,
    judge_assignment_id INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Draft',
    finalized_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),
    CHECK (status IN ('Draft', 'Finalized')),
    UNIQUE(submission_id, judge_assignment_id),
    FOREIGN KEY (submission_id) REFERENCES Submission(submission_id) ON DELETE NO ACTION,
    FOREIGN KEY (judge_assignment_id) REFERENCES JudgeAssignment(judge_assignment_id) ON DELETE NO ACTION
);

CREATE TABLE ScoreHistory (
    score_history_id INT IDENTITY(1,1) PRIMARY KEY,
    evaluation_id INT NOT NULL,
    criteria_id INT NOT NULL,
    old_score_value DECIMAL(5,2),
    new_score_value DECIMAL(5,2) NOT NULL,
    old_comment NVARCHAR(MAX),
    new_comment NVARCHAR(MAX),
    action_type VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    CHECK (action_type IN ('SAVE_DRAFT', 'FINALIZE', 'REOPEN')),
    FOREIGN KEY (evaluation_id) REFERENCES JudgeEvaluation(evaluation_id) ON DELETE NO ACTION,
    FOREIGN KEY (criteria_id) REFERENCES ScoringCriteria(criteria_id) ON DELETE NO ACTION
);

CREATE TABLE Feedback (
    feedback_id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL,
    author_user_role_id INT NOT NULL,
    author_role VARCHAR(50) NOT NULL,
    feedback_text NVARCHAR(MAX) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    CHECK (author_role IN ('Judge', 'Mentor', 'Coordinator')),
    FOREIGN KEY (submission_id) REFERENCES Submission(submission_id) ON DELETE NO ACTION,
    FOREIGN KEY (author_user_role_id) REFERENCES UserRole(user_role_id) ON DELETE NO ACTION
);

CREATE TABLE CalibrationSession (
    session_id INT IDENTITY(1,1) PRIMARY KEY,
    round_id INT NOT NULL,
    title NVARCHAR(150) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (round_id) REFERENCES Round(round_id) ON DELETE CASCADE
);

CREATE TABLE CalibrationScore (
    calibration_score_id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NOT NULL,
    submission_id INT NOT NULL,
    criteria_id INT NOT NULL,
    judge_assignment_id INT NOT NULL,
    score_value DECIMAL(5,2) NOT NULL,
    comment NVARCHAR(MAX),
    scored_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (session_id) REFERENCES CalibrationSession(session_id) ON DELETE CASCADE,
    FOREIGN KEY (submission_id) REFERENCES Submission(submission_id) ON DELETE NO ACTION,
    FOREIGN KEY (criteria_id) REFERENCES ScoringCriteria(criteria_id) ON DELETE NO ACTION,
    FOREIGN KEY (judge_assignment_id) REFERENCES JudgeAssignment(judge_assignment_id) ON DELETE NO ACTION
);

-- =======================================================
-- 6. PRIZES, RANKINGS & AUDITS
-- =======================================================
CREATE TABLE CriteriaTemplate (
    template_id INT IDENTITY(1,1) PRIMARY KEY,
    template_name NVARCHAR(150) NOT NULL,
    description NVARCHAR(500) NULL,
    created_by_user_id INT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (created_by_user_id) REFERENCES [Users](user_id) ON DELETE NO ACTION
);

CREATE TABLE CriteriaTemplateItem (
    template_item_id INT IDENTITY(1,1) PRIMARY KEY,
    template_id INT NOT NULL,
    criteria_name NVARCHAR(150) NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    criteria_type VARCHAR(50) NOT NULL,
    sort_order INT NOT NULL,
    FOREIGN KEY (template_id) REFERENCES CriteriaTemplate(template_id) ON DELETE CASCADE
);

CREATE TABLE Prize (
    prize_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL,
    prize_name NVARCHAR(100) NOT NULL, 
    FOREIGN KEY (event_id) REFERENCES HackathonEvent(event_id) ON DELETE CASCADE
);

CREATE TABLE Ranking (
    ranking_id INT IDENTITY(1,1) PRIMARY KEY,
    team_id INT NOT NULL,
    round_id INT NOT NULL,
    prize_id INT NULL,
    rank_position INT NOT NULL,
    total_score DECIMAL(5,2) NOT NULL,
    qualified_next_round BIT DEFAULT 0,
    calculated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (team_id) REFERENCES Team(team_id) ON DELETE NO ACTION,
    FOREIGN KEY (round_id) REFERENCES Round(round_id) ON DELETE NO ACTION,
    FOREIGN KEY (prize_id) REFERENCES Prize(prize_id) ON DELETE NO ACTION
);

CREATE TABLE TeamPrize (
    team_prize_id INT IDENTITY(1,1) PRIMARY KEY,
    team_id INT NOT NULL,
    prize_id INT NOT NULL,
    awarded_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (team_id) REFERENCES Team(team_id) ON DELETE CASCADE,
    FOREIGN KEY (prize_id) REFERENCES Prize(prize_id) ON DELETE NO ACTION
);

CREATE TABLE EliminationRecord (
    elimination_id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL,
    coordinator_assignment_id INT NOT NULL, 
    reason NVARCHAR(MAX) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (submission_id) REFERENCES Submission(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (coordinator_assignment_id) REFERENCES EventCoordinatorAssignment(coordinator_assignment_id) ON DELETE NO ACTION
);

CREATE TABLE AuditLog (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL, 
    action_type VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    target_id INT NULL,
    target_name NVARCHAR(255),
    old_value NVARCHAR(MAX),
    new_value NVARCHAR(MAX),
    reason NVARCHAR(MAX),
    ip_address VARCHAR(64),
    device_info NVARCHAR(1000),
    timestamp DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES [Users](user_id) ON DELETE CASCADE
);
GO

-- =======================================================
-- 7. TEAM VALIDATION GUARDS
-- =======================================================
CREATE OR ALTER TRIGGER TR_TeamMember_ValidateRules
ON TeamMember
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT tm.team_id
        FROM TeamMember tm
        JOIN (SELECT DISTINCT team_id FROM inserted) changed ON changed.team_id = tm.team_id
        GROUP BY tm.team_id
        HAVING COUNT(*) > 5
    )
        THROW 50001, 'A team cannot contain more than 5 members.', 1;

    IF EXISTS (
        SELECT tm.user_role_id, tr.event_id
        FROM TeamMember tm
        JOIN Team t ON t.team_id = tm.team_id
        JOIN Track tr ON tr.track_id = t.track_id
        JOIN (SELECT DISTINCT user_role_id FROM inserted) changed ON changed.user_role_id = tm.user_role_id
        GROUP BY tm.user_role_id, tr.event_id
        HAVING COUNT(*) > 1
    )
        THROW 50002, 'A student can belong to only one team in the same event.', 1;
END;
GO

CREATE OR ALTER TRIGGER TR_Submission_ValidateTeamSize
ON Submission
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        WHERE (
            SELECT COUNT(*)
            FROM TeamMember tm
            WHERE tm.team_id = i.team_id
        ) NOT BETWEEN 3 AND 5
    )
        THROW 50003, 'A submission requires a valid team with 3 to 5 members.', 1;
END;
GO
