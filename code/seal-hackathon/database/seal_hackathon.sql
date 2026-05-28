USE master;
GO

IF DB_ID('seal_hackathon') IS NOT NULL
BEGIN
    ALTER DATABASE seal_hackathon SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE seal_hackathon;
END
GO

CREATE DATABASE seal_hackathon;
GO

USE seal_hackathon;
GO

-- ==========================================
-- 1. USER & ROLE DOMAIN
-- ==========================================

CREATE TABLE dbo.[User] (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name NVARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PendingApproval',
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT CHK_User_Status CHECK (status IN ('PendingApproval', 'Active', 'Rejected', 'Suspended'))
);

CREATE TABLE dbo.UserRole (
    user_role_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    role_type VARCHAR(50) NOT NULL,
    CONSTRAINT FK_UserRole_User FOREIGN KEY (user_id) REFERENCES dbo.[User](user_id) ON DELETE CASCADE,
    CONSTRAINT UQ_User_Role UNIQUE (user_id, role_type),
    CONSTRAINT CHK_UserRole_Type CHECK (role_type IN ('Student', 'Mentor', 'Judge', 'Coordinator'))
);

CREATE TABLE dbo.StudentProfile (
    user_role_id INT PRIMARY KEY,
    student_type VARCHAR(50) NOT NULL,
    student_code VARCHAR(50) NULL,
    university_name NVARCHAR(255) NULL,
    CONSTRAINT FK_StudentProfile_UserRole FOREIGN KEY (user_role_id) REFERENCES dbo.UserRole(user_role_id) ON DELETE CASCADE,
    CONSTRAINT CHK_StudentProfile_Type CHECK (student_type IN ('FPT', 'External'))
);

CREATE TABLE dbo.MentorProfile (
    user_role_id INT PRIMARY KEY,
    department NVARCHAR(255) NULL,
    specialization NVARCHAR(255) NULL,
    CONSTRAINT FK_MentorProfile_UserRole FOREIGN KEY (user_role_id) REFERENCES dbo.UserRole(user_role_id) ON DELETE CASCADE
);

CREATE TABLE dbo.JudgeProfile (
    user_role_id INT PRIMARY KEY,
    judge_type VARCHAR(50) NOT NULL,
    organization NVARCHAR(255) NULL,
    account_expiry DATETIME NULL,
    CONSTRAINT FK_JudgeProfile_UserRole FOREIGN KEY (user_role_id) REFERENCES dbo.UserRole(user_role_id) ON DELETE CASCADE,
    CONSTRAINT CHK_JudgeProfile_Type CHECK (judge_type IN ('Internal', 'Guest'))
);

CREATE TABLE dbo.CoordinatorProfile (
    user_role_id INT PRIMARY KEY,
    staff_type VARCHAR(50) NULL,
    CONSTRAINT FK_CoordinatorProfile_UserRole FOREIGN KEY (user_role_id) REFERENCES dbo.UserRole(user_role_id) ON DELETE CASCADE
);

-- ==========================================
-- 2. EVENT & TRACK DOMAIN
-- ==========================================

CREATE TABLE dbo.HackathonEvent (
    event_id INT IDENTITY(1,1) PRIMARY KEY,
    coordinator_id INT NULL,
    name NVARCHAR(255) NOT NULL,
    season VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    description NVARCHAR(MAX) NULL,
    CONSTRAINT FK_HackathonEvent_Coordinator FOREIGN KEY (coordinator_id) REFERENCES dbo.CoordinatorProfile(user_role_id) ON DELETE SET NULL,
    CONSTRAINT CHK_Event_Season CHECK (season IN ('Spring', 'Summer', 'Fall')),
    CONSTRAINT CHK_Event_Status CHECK (status IN ('Draft', 'Open', 'Ongoing', 'Closed', 'Completed')),
    CONSTRAINT CHK_Event_Dates CHECK (start_date < end_date)
);

CREATE TABLE dbo.Track (
    track_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL,
    user_role_id INT NULL,
    name NVARCHAR(255) NOT NULL,
    CONSTRAINT FK_Track_Event FOREIGN KEY (event_id) REFERENCES dbo.HackathonEvent(event_id) ON DELETE CASCADE
);

CREATE TABLE dbo.Round (
    round_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL,
    round_name NVARCHAR(255) NOT NULL,
    round_order INT NOT NULL,
    submission_deadline DATETIME NOT NULL,
    promotion_rule_top_n INT NULL,
    CONSTRAINT FK_Round_Event FOREIGN KEY (event_id) REFERENCES dbo.HackathonEvent(event_id) ON DELETE CASCADE,
    CONSTRAINT UQ_Round_Order UNIQUE (event_id, round_order)
);

CREATE TABLE dbo.Prize (
    prize_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL,
    prize_name NVARCHAR(255) NOT NULL,
    CONSTRAINT FK_Prize_Event FOREIGN KEY (event_id) REFERENCES dbo.HackathonEvent(event_id) ON DELETE CASCADE
);

-- ==========================================
-- 3. TEAM DOMAIN
-- ==========================================

CREATE TABLE dbo.Team (
    team_id INT IDENTITY(1,1) PRIMARY KEY,
    user_role_id INT NOT NULL,
    track_id INT NOT NULL,
    team_name NVARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    CONSTRAINT FK_Team_Track FOREIGN KEY (track_id) REFERENCES dbo.Track(track_id) ON DELETE CASCADE,
    CONSTRAINT CHK_Team_Status CHECK (status IN ('Active', 'Eliminated', 'Completed')),
    CONSTRAINT UQ_Team_Name_Track UNIQUE (track_id, team_name)
);

CREATE TABLE dbo.TeamMember (
    team_id INT NOT NULL,
    user_role_id INT NOT NULL,
    joined_at DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (team_id, user_role_id),
    CONSTRAINT FK_TeamMember_Team FOREIGN KEY (team_id) REFERENCES dbo.Team(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_TeamMember_UserRole FOREIGN KEY (user_role_id) REFERENCES dbo.StudentProfile(user_role_id)
);

-- ==========================================
-- 4. ASSIGNMENT DOMAIN
-- ==========================================

CREATE TABLE dbo.TrackMentor (
    track_mentor_id INT IDENTITY(1,1) PRIMARY KEY,
    user_role_id INT NOT NULL,
    track_id INT NOT NULL,
    assigned_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_TrackMentor_UserRole FOREIGN KEY (user_role_id) REFERENCES dbo.MentorProfile(user_role_id),
    CONSTRAINT FK_TrackMentor_Track FOREIGN KEY (track_id) REFERENCES dbo.Track(track_id) ON DELETE CASCADE,
    CONSTRAINT UQ_Track_Mentor UNIQUE (user_role_id, track_id)
);

CREATE TABLE dbo.JudgeAssignment (
    assignment_id INT IDENTITY(1,1) PRIMARY KEY,
    judge_id INT NOT NULL,
    round_id INT NOT NULL,
    assigned_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_JudgeAssignment_User FOREIGN KEY (judge_id) REFERENCES dbo.JudgeProfile(user_role_id) ON DELETE CASCADE,
    CONSTRAINT FK_JudgeAssignment_Round FOREIGN KEY (round_id) REFERENCES dbo.Round(round_id) ON DELETE CASCADE,
    CONSTRAINT UQ_Judge_Round UNIQUE (judge_id, round_id)
);

-- ==========================================
-- 5. SUBMISSION & EVALUATION DOMAIN
-- ==========================================

CREATE TABLE dbo.Submission (
    submission_id INT IDENTITY(1,1) PRIMARY KEY,
    team_id INT NOT NULL,
    round_id INT NOT NULL,
    repository_url VARCHAR(500) NOT NULL,
    demo_url VARCHAR(500) NULL,
    slide_url VARCHAR(500) NULL,
    github_metadata NVARCHAR(MAX) NULL,
    submitted_at DATETIME DEFAULT GETDATE(),
    is_calibration BIT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Submitted',
    CONSTRAINT FK_Submission_Team FOREIGN KEY (team_id) REFERENCES dbo.Team(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_Submission_Round FOREIGN KEY (round_id) REFERENCES dbo.Round(round_id),
    CONSTRAINT CHK_Submission_Status CHECK (status IN ('Submitted', 'UnderEvaluation', 'Evaluated'))
);

CREATE TABLE dbo.ScoringCriteria (
    criteria_id INT IDENTITY(1,1) PRIMARY KEY,
    round_id INT NOT NULL,
    criteria_name NVARCHAR(255) NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    criteria_type VARCHAR(50) NOT NULL,
    CONSTRAINT FK_ScoringCriteria_Round FOREIGN KEY (round_id) REFERENCES dbo.Round(round_id) ON DELETE CASCADE,
    CONSTRAINT CHK_Criteria_Weight CHECK (weight > 0 AND weight <= 100)
);

CREATE TABLE dbo.Score (
    score_id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL,
    criteria_id INT NOT NULL,
    user_role_id INT NOT NULL,
    score_value DECIMAL(5,2) NOT NULL,
    comment NVARCHAR(MAX) NULL,
    scored_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Score_Submission FOREIGN KEY (submission_id) REFERENCES dbo.Submission(submission_id) ON DELETE CASCADE,
    CONSTRAINT FK_Score_Criteria FOREIGN KEY (criteria_id) REFERENCES dbo.ScoringCriteria(criteria_id),
    CONSTRAINT FK_Score_JudgeAssignment FOREIGN KEY (user_role_id) REFERENCES dbo.JudgeAssignment(assignment_id),
    CONSTRAINT UQ_Score_Submission_Criteria_Judge UNIQUE (submission_id, criteria_id, user_role_id)
);

-- ==========================================
-- 6. RANKING & PRIZE DOMAIN
-- ==========================================

CREATE TABLE dbo.TeamPrize (
    team_prize_id INT IDENTITY(1,1) PRIMARY KEY,
    team_id INT NOT NULL,
    prize_id INT NOT NULL,
    score_id INT NULL,
    awarded_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_TeamPrize_Team FOREIGN KEY (team_id) REFERENCES dbo.Team(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_TeamPrize_Prize FOREIGN KEY (prize_id) REFERENCES dbo.Prize(prize_id),
    CONSTRAINT FK_TeamPrize_Score FOREIGN KEY (score_id) REFERENCES dbo.Score(score_id),
    CONSTRAINT UQ_Team_Prize UNIQUE (team_id, prize_id)
);

CREATE TABLE dbo.Ranking (
    ranking_id INT IDENTITY(1,1) PRIMARY KEY,
    team_id INT NOT NULL,
    round_id INT NOT NULL,
    track_id INT NULL,
    prize_id INT NULL,
    rank_position INT NOT NULL,
    total_score DECIMAL(5,2) NOT NULL,
    qualified_next_round BIT NOT NULL DEFAULT 0,
    calculated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Ranking_Team FOREIGN KEY (team_id) REFERENCES dbo.Team(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_Ranking_Round FOREIGN KEY (round_id) REFERENCES dbo.Round(round_id),
    CONSTRAINT FK_Ranking_Track FOREIGN KEY (track_id) REFERENCES dbo.Track(track_id),
    CONSTRAINT FK_Ranking_Prize FOREIGN KEY (prize_id) REFERENCES dbo.Prize(prize_id),
    CONSTRAINT UQ_Team_Round_Ranking UNIQUE (team_id, round_id)
);

CREATE TABLE dbo.EliminationRecord (
    elimination_id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL,
    user_role_id INT NOT NULL,
    reason NVARCHAR(MAX) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Elimination_Submission FOREIGN KEY (submission_id) REFERENCES dbo.Submission(submission_id) ON DELETE CASCADE,
    CONSTRAINT FK_Elimination_Coordinator FOREIGN KEY (user_role_id) REFERENCES dbo.CoordinatorProfile(user_role_id)
);

-- ==========================================
-- 7. CALIBRATION & RESEARCH DOMAIN (RBL)
-- ==========================================

CREATE TABLE dbo.CalibrationSession (
    session_id INT IDENTITY(1,1) PRIMARY KEY,
    round_id INT NOT NULL,
    title NVARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_CalibrationSession_Round FOREIGN KEY (round_id) REFERENCES dbo.Round(round_id) ON DELETE CASCADE,
    CONSTRAINT CHK_CalibrationSession_Status CHECK (status IN ('Pending', 'Active', 'Completed'))
);

CREATE TABLE dbo.CalibrationScore (
    calibration_score_id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NOT NULL,
    submission_id INT NOT NULL,
    user_role_id INT NOT NULL,
    criteria_id INT NOT NULL,
    score_value DECIMAL(5,2) NOT NULL,
    comment NVARCHAR(MAX) NULL,
    scored_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_CalibrationScore_Session FOREIGN KEY (session_id) REFERENCES dbo.CalibrationSession(session_id) ON DELETE CASCADE,
    CONSTRAINT FK_CalibrationScore_Submission FOREIGN KEY (submission_id) REFERENCES dbo.Submission(submission_id),
    CONSTRAINT FK_CalibrationScore_UserRole FOREIGN KEY (user_role_id) REFERENCES dbo.JudgeProfile(user_role_id),
    CONSTRAINT FK_CalibrationScore_Criteria FOREIGN KEY (criteria_id) REFERENCES dbo.ScoringCriteria(criteria_id)
);

-- ==========================================
-- 8. AUDIT DOMAIN
-- ==========================================

CREATE TABLE dbo.AuditLog (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL,
    action_type VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    target_id INT NOT NULL,
    timestamp DATETIME DEFAULT GETDATE(),
    old_value NVARCHAR(MAX) NULL,
    new_value NVARCHAR(MAX) NULL,
    reason NVARCHAR(MAX) NULL,
    CONSTRAINT FK_AuditLog_User FOREIGN KEY (user_id) REFERENCES dbo.[User](user_id) ON DELETE SET NULL
);

-- ==========================================
-- DATABASE INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IX_UserRole_User ON dbo.UserRole(user_id);
CREATE INDEX IX_Team_Leader ON dbo.Team(user_role_id);
CREATE INDEX IX_TeamMember_Team ON dbo.TeamMember(team_id);
CREATE INDEX IX_Submission_Team ON dbo.Submission(team_id);
CREATE INDEX IX_Score_Submission ON dbo.Score(submission_id);
CREATE INDEX IX_Score_Judge ON dbo.Score(user_role_id);
CREATE INDEX IX_Ranking_Round ON dbo.Ranking(round_id);
CREATE INDEX IX_AuditLog_Timestamp ON dbo.AuditLog(timestamp);
GO

-- =========================================================================
-- SEED DATA (MOCK DATA FOR TESTING - SQL SERVER)
-- =========================================================================

INSERT INTO dbo.[User] (email, password_hash, full_name, status, created_at) VALUES
('coordinator@fpt.edu.vn', 'hash_coord_123', N'Nguyễn Văn A (BTC)', 'Active', GETDATE()),
('mentor1@fpt.edu.vn', 'hash_mentor_123', N'Trần Thị B (Mentor)', 'Active', GETDATE()),
('judge1@fpt.edu.vn', 'hash_judge_123', N'Lê Hoàng C (Giám khảo)', 'Active', GETDATE()),
('guestjudge@guest.com', 'hash_guest_123', N'Mr. Smith (Giám khảo khách mời)', 'Active', GETDATE()),
('leader1@fpt.edu.vn', 'hash_student_123', N'Phạm Minh D (Trưởng nhóm)', 'Active', GETDATE()),
('member1@fpt.edu.vn', 'hash_student_123', N'Đỗ Quốc E (Thành viên)', 'Active', GETDATE()),
('member2@fpt.edu.vn', 'hash_student_123', N'Vũ Thị F (Thành viên)', 'Active', GETDATE());

INSERT INTO dbo.UserRole (user_id, role_type) VALUES
(1, 'Coordinator'),
(2, 'Mentor'),
(3, 'Judge'),
(4, 'Judge'),
(5, 'Student'),
(6, 'Student'),
(7, 'Student');

INSERT INTO dbo.CoordinatorProfile (user_role_id, staff_type) VALUES (1, 'FPT_SE_Faculty');

INSERT INTO dbo.MentorProfile (user_role_id, department, specialization) VALUES (2, 'Software Engineering', 'Agile & DevOps');

INSERT INTO dbo.JudgeProfile (user_role_id, judge_type, organization, account_expiry) VALUES 
(3, 'Internal', 'FPT University', NULL),
(4, 'Guest', 'Tech Company X', DATEADD(day, 30, GETDATE()));

INSERT INTO dbo.StudentProfile (user_role_id, student_type, student_code, university_name) VALUES
(5, 'FPT', 'SE190001', 'FPT University'),
(6, 'FPT', 'SE190002', 'FPT University'),
(7, 'External', 'EX200999', 'HUTECH University');

INSERT INTO dbo.HackathonEvent (coordinator_id, name, season, year, start_date, end_date, status, description) VALUES
(1, N'SEAL Hackathon Summer 2026', 'Summer', 2026, '2026-05-01 08:00:00', '2026-06-30 18:00:00', 'Ongoing', N'Academic Hackathon for Software Engineering Department, FPT University.');

INSERT INTO dbo.Track (event_id, user_role_id, name) VALUES
(1, 1, 'AI Automation'),
(1, 1, 'Web Development');

INSERT INTO dbo.Round (event_id, round_name, round_order, submission_deadline, promotion_rule_top_n) VALUES
(1, N'Preliminary Round', 1, '2026-06-05 23:59:59', 5),
(1, N'Final Round', 2, '2026-06-25 23:59:59', NULL);

INSERT INTO dbo.TrackMentor (user_role_id, track_id) VALUES (2, 1);

INSERT INTO dbo.JudgeAssignment (judge_id, round_id) VALUES
(3, 1),
(4, 1);

INSERT INTO dbo.Team (user_role_id, track_id, team_name, status) VALUES
(5, 1, 'SEAL Masters', 'Active');

INSERT INTO dbo.TeamMember (team_id, user_role_id) VALUES
(1, 5),
(1, 6),
(1, 7);

INSERT INTO dbo.ScoringCriteria (round_id, criteria_name, weight, criteria_type) VALUES
(1, N'System Architecture & Design', 30.00, 'Technical'),
(1, N'Coding Quality & Repository', 40.00, 'Technical'),
(1, N'Presentation & Demo', 30.00, 'Presentation');

INSERT INTO dbo.Submission (team_id, round_id, repository_url, demo_url, slide_url, github_metadata, is_calibration, status) VALUES
(1, 1, 'https://github.com/seal-masters/ai-automation-project', 'https://sealmasters.demo.dev', 'https://slide.com/sealmasters-deck', N'{"stars": 5, "commits": 42}', 0, 'Submitted');

INSERT INTO dbo.Score (submission_id, criteria_id, user_role_id, score_value, comment) VALUES
(1, 1, 1, 8.50, N'Solid architecture, nice clean components.'),
(1, 2, 1, 9.00, N'Highly structured code, great git branching strategy.'),
(1, 3, 1, 8.00, N'Presentation was clear, demo ran smoothly.'),
(1, 1, 2, 8.00, N'Good architecture, but could optimize DB calls.'),
(1, 2, 2, 8.50, N'Clean code, unit tests are present.'),
(1, 3, 2, 8.50, N'Very engaging presentation, well prepared.');

INSERT INTO dbo.Prize (event_id, prize_name) VALUES
(1, N'Champion'),
(1, N'Runner-up');

INSERT INTO dbo.AuditLog (user_id, action_type, target_entity, target_id, old_value, new_value, reason) VALUES
(1, 'USER_APPROVAL', 'User', 5, 'PendingApproval', 'Active', 'Approved student registration after ID validation.'),
(1, 'USER_APPROVAL', 'User', 6, 'PendingApproval', 'Active', 'Approved student registration after ID validation.'),
(1, 'USER_APPROVAL', 'User', 7, 'PendingApproval', 'Active', 'Approved external student registration.');
GO
