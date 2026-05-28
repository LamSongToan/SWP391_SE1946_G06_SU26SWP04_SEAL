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
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name NVARCHAR(150) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Disabled')),
    is_approved BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE UserRole (
    user_role_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    role_type VARCHAR(50) NOT NULL, 
    CHECK (role_type IN ('Student', 'Mentor', 'Judge', 'Coordinator')),
    FOREIGN KEY (user_id) REFERENCES [Users](user_id) ON DELETE CASCADE
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
    season VARCHAR(20) NOT NULL, -- 'Spring', 'Summer', 'Fall'
    year INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Upcoming',
    description NVARCHAR(MAX)
);

CREATE TABLE Track (
    track_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL, 
    FOREIGN KEY (event_id) REFERENCES HackathonEvent(event_id) ON DELETE CASCADE
);

CREATE TABLE Round (
    round_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL,
    round_name NVARCHAR(100) NOT NULL, -- 'Elimination', 'Finals'
    round_order INT NOT NULL,
    submission_deadline DATETIME NOT NULL,
    promotion_rule_top_n INT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES HackathonEvent(event_id) ON DELETE CASCADE
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
    track_id INT NOT NULL,
    user_role_id INT NOT NULL, -- TEAM LEADER
    team_name NVARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
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
    repository_url VARCHAR(255) NOT NULL,
    demo_url VARCHAR(255),
    slide_url VARCHAR(255),
    github_metadata NVARCHAR(MAX), 
    is_calibration BIT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Submitted',
    CHECK (status IN ('Submitted', 'Evaluating', 'Qualified', 'Eliminated')),
    submitted_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (team_id) REFERENCES Team(team_id) ON DELETE NO ACTION,
    FOREIGN KEY (round_id) REFERENCES Round(round_id) ON DELETE NO ACTION
);

CREATE TABLE Score (
    score_id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL,
    criteria_id INT NOT NULL,
    judge_assignment_id INT NOT NULL, 
    score_value DECIMAL(5,2) NOT NULL,
    comment NVARCHAR(MAX),
    scored_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (submission_id) REFERENCES Submission(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (criteria_id) REFERENCES ScoringCriteria(criteria_id) ON DELETE NO ACTION,
    FOREIGN KEY (judge_assignment_id) REFERENCES JudgeAssignment(judge_assignment_id) ON DELETE NO ACTION
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
    target_id INT NOT NULL,
    old_value NVARCHAR(MAX),
    new_value NVARCHAR(MAX),
    reason NVARCHAR(MAX),
    timestamp DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES [Users](user_id) ON DELETE CASCADE
);
GO