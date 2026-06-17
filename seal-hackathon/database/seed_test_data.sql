USE SEAL_Hackathon_G06;
GO

-- =======================================================
-- Seed users (for email login system testing)
-- Password for all seeded users: Seal@2026.
-- =======================================================
INSERT INTO [Users] (username, email, password_hash, full_name, avatar_url, bio, status, is_approved)
VALUES
('an.student', 'an.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Nguyen Van An', NULL, N'FPT Software Engineering student focused on product execution and team coordination.', 'Active', 1),
('toan.coordinator', 'toan.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Toan Tran', NULL, N'Coordinator for event operations, participant approval, and semester planning.', 'Active', 1),
('kiet.mentor', 'kiet.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Kiet Le', NULL, N'Mentor supporting web architecture, product direction, and technical tradeoffs.', 'Active', 1),
('ngon.judge', 'ngon.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Ngon Pham', NULL, N'Guest judge reviewing implementation quality, product value, and presentation.', 'Active', 1),
('linh.student', 'linh.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Linh Vo', NULL, N'External student interested in cross-university collaboration and applied software delivery.', 'Active', 1),
('mai.student', 'mai.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Mai Nguyen', NULL, N'FPT student with interest in frontend polish, user experience, and rapid iteration.', 'Active', 1),
('bao.student', 'bao.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Bao Tran', NULL, N'FPT student testing multi-team creation and collaboration workflows.', 'Active', 1),
('quynh.student', 'quynh.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Quynh Le', NULL, N'FPT student focused on frontend polish and team invitation testing.', 'Active', 1),
('phuc.student', 'phuc.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Phuc Nguyen', NULL, N'FPT student used for extra team and submission testing.', 'Active', 1),
('nhat.student', 'nhat.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Nhat Hoang', NULL, N'External student for cross-university registration and approval scenarios.', 'Active', 1),
('thao.student', 'thao.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Thao Pham', NULL, N'External student for invitation, team size, and event registration flows.', 'Active', 1),
('lam.student', 'lam.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Lam Do', NULL, N'External student for search, team management, and profile testing.', 'Active', 1),
('vy.mentor', 'vy.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Vy Truong', NULL, N'Mentor for AI and data product strategy testing.', 'Active', 1),
('duc.mentor', 'duc.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Duc Bui', NULL, N'Mentor for mobile delivery and product execution scenarios.', 'Active', 1),
('hao.judge', 'hao.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Hao Vu', NULL, N'Judge for assignment, scoring, and evaluation workflow testing.', 'Active', 1),
('trinh.judge', 'trinh.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Trinh Dang', NULL, N'Judge for round assignment and score finalization testing.', 'Active', 1),
('anh.coordinator', 'anh.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Anh Nguyen', NULL, N'Coordinator for approval, event setup, and audit log verification.', 'Active', 1);
GO

INSERT INTO UserRole (user_id, role_type)
SELECT user_id, 'Student' FROM [Users] WHERE username IN ('an.student', 'linh.student', 'mai.student', 'bao.student', 'quynh.student', 'phuc.student', 'nhat.student', 'thao.student', 'lam.student');
INSERT INTO UserRole (user_id, role_type)
SELECT user_id, 'Coordinator' FROM [Users] WHERE username IN ('toan.coordinator', 'anh.coordinator');
INSERT INTO UserRole (user_id, role_type)
SELECT user_id, 'Mentor' FROM [Users] WHERE username IN ('kiet.mentor', 'vy.mentor', 'duc.mentor');
INSERT INTO UserRole (user_id, role_type)
SELECT user_id, 'Judge' FROM [Users] WHERE username IN ('ngon.judge', 'hao.judge', 'trinh.judge');
GO

INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
SELECT ur.user_role_id, 'FPT', 'SE181001', N'FPT University HCMC'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'an.student' AND ur.role_type = 'Student';

INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
SELECT ur.user_role_id, 'EXTERNAL', 'EXT2026-01', N'Ho Chi Minh University of Technology'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'linh.student' AND ur.role_type = 'Student';

INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
SELECT ur.user_role_id, 'FPT', 'SE181002', N'FPT University HCMC'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'mai.student' AND ur.role_type = 'Student';

INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
SELECT ur.user_role_id, 'FPT', 'SE181003', N'FPT University HCMC'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'bao.student' AND ur.role_type = 'Student';

INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
SELECT ur.user_role_id, 'FPT', 'SE181004', N'FPT University HCMC'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'quynh.student' AND ur.role_type = 'Student';

INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
SELECT ur.user_role_id, 'FPT', 'SE181005', N'FPT University HCMC'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'phuc.student' AND ur.role_type = 'Student';

INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
SELECT ur.user_role_id, 'EXTERNAL', 'UIT2026-01', N'University of Information Technology'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'nhat.student' AND ur.role_type = 'Student';

INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
SELECT ur.user_role_id, 'EXTERNAL', 'HCMUT2026-01', N'Ho Chi Minh City University of Technology'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'thao.student' AND ur.role_type = 'Student';

INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
SELECT ur.user_role_id, 'EXTERNAL', 'RMIT2026-01', N'RMIT Vietnam'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'lam.student' AND ur.role_type = 'Student';

INSERT INTO CoordinatorProfile (user_role_id, staff_type)
SELECT ur.user_role_id, 'SE Dept'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'toan.coordinator' AND ur.role_type = 'Coordinator';

INSERT INTO CoordinatorProfile (user_role_id, staff_type)
SELECT ur.user_role_id, 'Innovation Hub'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'anh.coordinator' AND ur.role_type = 'Coordinator';

INSERT INTO MentorProfile (user_role_id, department, specialization)
SELECT ur.user_role_id, N'Software Engineering', N'Web Architecture'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'kiet.mentor' AND ur.role_type = 'Mentor';

INSERT INTO MentorProfile (user_role_id, department, specialization)
SELECT ur.user_role_id, N'AI & Data', N'Machine Learning Systems'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'vy.mentor' AND ur.role_type = 'Mentor';

INSERT INTO MentorProfile (user_role_id, department, specialization)
SELECT ur.user_role_id, N'Mobile Engineering', N'Product Delivery'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'duc.mentor' AND ur.role_type = 'Mentor';

INSERT INTO JudgeProfile (user_role_id, judge_type, organization)
SELECT ur.user_role_id, 'Guest', N'FPT Software'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'ngon.judge' AND ur.role_type = 'Judge';

INSERT INTO JudgeProfile (user_role_id, judge_type, organization)
SELECT ur.user_role_id, 'Guest', N'FPT Software'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'hao.judge' AND ur.role_type = 'Judge';

INSERT INTO JudgeProfile (user_role_id, judge_type, organization)
SELECT ur.user_role_id, 'Guest', N'Techcombank'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'trinh.judge' AND ur.role_type = 'Judge';
GO

-- =======================================================
-- Seed Spring 2026 event with participating teams
-- =======================================================
INSERT INTO HackathonEvent (
    name, semester, year, start_date, end_date,
    registration_start_at, registration_end_at,
    competition_start_at, competition_end_at,
    track_selection_mode, ranking_method, awards_json,
    published_at, status, description
)
VALUES (
    N'SEAL Spring 2026', 'Spring', 2026, '2026-02-10', '2026-04-20',
    '2026-02-01T08:00:00', '2026-02-08T23:59:00',
    '2026-02-10T08:00:00', '2026-04-20T18:00:00',
    'TEAM_SELECT', 'FINAL_SCORE', N'[{"awardName":"Champion","quantity":1},{"awardName":"Runner-up","quantity":1},{"awardName":"Best Innovation","quantity":1}]',
    GETDATE(), 'Ongoing', N'Seeded Spring 2026 event for participant and team testing'
);
GO

DECLARE @spring_event_id INT = (
    SELECT TOP 1 event_id
    FROM HackathonEvent
    WHERE name = N'SEAL Spring 2026'
    ORDER BY event_id DESC
);
DECLARE @spring_coordinator_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'toan.coordinator' AND ur.role_type = 'Coordinator'
);
DECLARE @spring_mentor_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'vy.mentor' AND ur.role_type = 'Mentor'
);
DECLARE @spring_judge_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'hao.judge' AND ur.role_type = 'Judge'
);
DECLARE @spring_student_leader_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'an.student' AND ur.role_type = 'Student'
);
DECLARE @spring_student_member_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'linh.student' AND ur.role_type = 'Student'
);
DECLARE @spring_student_third_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'mai.student' AND ur.role_type = 'Student'
);
DECLARE @spring_student_ai_leader_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'bao.student' AND ur.role_type = 'Student'
);
DECLARE @spring_student_ai_member_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'quynh.student' AND ur.role_type = 'Student'
);
DECLARE @spring_student_ai_third_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'phuc.student' AND ur.role_type = 'Student'
);

INSERT INTO Track (event_id, name)
VALUES
(@spring_event_id, N'Web Platform'),
(@spring_event_id, N'AI & Data');

INSERT INTO Round (event_id, round_name, round_order, start_at, end_at, submission_deadline, promotion_rule_top_n, is_final)
VALUES
(@spring_event_id, N'Qualifier', 1, '2026-02-10T08:00:00', '2026-03-15T23:59:00', '2026-03-15T23:59:00', 2, 0),
(@spring_event_id, N'Finals', 2, '2026-04-10T08:00:00', '2026-04-20T18:00:00', '2026-04-20T18:00:00', NULL, 1);

DECLARE @spring_track_web_id INT = (
    SELECT TOP 1 track_id
    FROM Track
    WHERE event_id = @spring_event_id AND name = N'Web Platform'
    ORDER BY track_id DESC
);
DECLARE @spring_track_ai_id INT = (
    SELECT TOP 1 track_id
    FROM Track
    WHERE event_id = @spring_event_id AND name = N'AI & Data'
    ORDER BY track_id DESC
);
DECLARE @spring_round_id INT = (
    SELECT TOP 1 round_id
    FROM Round
    WHERE event_id = @spring_event_id AND round_name = N'Qualifier'
    ORDER BY round_id DESC
);

INSERT INTO EventCoordinatorAssignment (event_id, user_role_id)
VALUES (@spring_event_id, @spring_coordinator_role_id);

INSERT INTO TrackMentor (track_id, user_role_id)
VALUES
(@spring_track_web_id, @spring_mentor_role_id),
(@spring_track_ai_id, @spring_mentor_role_id);

INSERT INTO JudgeAssignment (round_id, track_id, user_role_id)
VALUES
(@spring_round_id, @spring_track_web_id, @spring_judge_role_id),
(@spring_round_id, @spring_track_ai_id, @spring_judge_role_id);

INSERT INTO Team (track_id, user_role_id, team_name)
VALUES
(@spring_track_web_id, @spring_student_leader_role_id, N'Spring Web Sparks'),
(@spring_track_ai_id, @spring_student_ai_leader_role_id, N'Spring AI Builders');

DECLARE @spring_web_team_id INT = (
    SELECT TOP 1 team_id
    FROM Team
    WHERE team_name = N'Spring Web Sparks'
    ORDER BY team_id DESC
);
DECLARE @spring_ai_team_id INT = (
    SELECT TOP 1 team_id
    FROM Team
    WHERE team_name = N'Spring AI Builders'
    ORDER BY team_id DESC
);

INSERT INTO TeamMember (team_id, user_role_id)
VALUES
(@spring_web_team_id, @spring_student_leader_role_id),
(@spring_web_team_id, @spring_student_member_role_id),
(@spring_web_team_id, @spring_student_third_role_id),
(@spring_ai_team_id, @spring_student_ai_leader_role_id),
(@spring_ai_team_id, @spring_student_ai_member_role_id),
(@spring_ai_team_id, @spring_student_ai_third_role_id);
GO

-- =======================================================
-- Seed event, track, rounds, criteria
-- =======================================================
INSERT INTO HackathonEvent (
    name, semester, year, start_date, end_date,
    registration_start_at, registration_end_at,
    competition_start_at, competition_end_at,
    track_selection_mode, ranking_method, awards_json,
    published_at, status, description
)
VALUES (
    N'SEAL Summer 2026', 'Summer', 2026, '2026-06-15', '2026-07-20',
    '2026-06-10T08:00:00', '2026-06-25T23:59:00',
    '2026-06-15T08:00:00', '2026-07-20T18:00:00',
    'TEAM_SELECT', 'FINAL_SCORE', N'[{"awardName":"Champion","quantity":1},{"awardName":"Runner-up","quantity":1}]',
    GETDATE(), 'Ongoing', N'Official seeded event for sprint integration testing'
);
GO

DECLARE @event_id INT = (SELECT TOP 1 event_id FROM HackathonEvent WHERE name = N'SEAL Summer 2026' ORDER BY event_id DESC);

INSERT INTO Track (event_id, name)
VALUES
(@event_id, N'Web Platform'),
(@event_id, N'AI & Data');
GO

DECLARE @event_id_2 INT = (SELECT TOP 1 event_id FROM HackathonEvent WHERE name = N'SEAL Summer 2026' ORDER BY event_id DESC);

INSERT INTO Round (event_id, round_name, round_order, start_at, end_at, submission_deadline, promotion_rule_top_n, is_final)
VALUES
(@event_id_2, N'Elimination', 1, '2026-06-20T08:00:00', '2026-06-30T23:59:00', '2026-06-30T23:59:00', 2, 0),
(@event_id_2, N'Finals', 2, '2026-07-15T08:00:00', '2026-07-18T23:59:00', '2026-07-18T23:59:00', NULL, 1);
GO

DECLARE @elim_round_id INT = (
    SELECT TOP 1 round_id FROM Round WHERE round_name = N'Elimination' ORDER BY round_id DESC
);

INSERT INTO ScoringCriteria (round_id, criteria_name, weight, criteria_type)
VALUES
(@elim_round_id, N'Problem-Solution Fit', 30.00, 'Technical'),
(@elim_round_id, N'Implementation Quality', 40.00, 'Technical'),
(@elim_round_id, N'Presentation', 30.00, 'SoftSkill');
GO

-- =======================================================
-- Seed assignments, team, submission, score
-- =======================================================
DECLARE @track_web_id INT = (SELECT TOP 1 track_id FROM Track WHERE name = N'Web Platform' ORDER BY track_id DESC);
DECLARE @elim_round_id_2 INT = (SELECT TOP 1 round_id FROM Round WHERE round_name = N'Elimination' ORDER BY round_id DESC);
DECLARE @student_leader_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'an.student' AND ur.role_type = 'Student'
);
DECLARE @student_member_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'linh.student' AND ur.role_type = 'Student'
);
DECLARE @student_third_member_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'mai.student' AND ur.role_type = 'Student'
);
DECLARE @mentor_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'kiet.mentor' AND ur.role_type = 'Mentor'
);
DECLARE @judge_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'ngon.judge' AND ur.role_type = 'Judge'
);
DECLARE @coordinator_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'toan.coordinator' AND ur.role_type = 'Coordinator'
);

INSERT INTO TrackMentor (track_id, user_role_id)
VALUES (@track_web_id, @mentor_role_id);

INSERT INTO JudgeAssignment (round_id, track_id, user_role_id)
VALUES (@elim_round_id_2, @track_web_id, @judge_role_id);

DECLARE @event_for_coordinator INT = (SELECT TOP 1 event_id FROM HackathonEvent WHERE name = N'SEAL Summer 2026' ORDER BY event_id DESC);
INSERT INTO EventCoordinatorAssignment (event_id, user_role_id)
VALUES (@event_for_coordinator, @coordinator_role_id);

INSERT INTO Team (track_id, user_role_id, team_name)
VALUES (@track_web_id, @student_leader_role_id, N'SEAL Coders');

DECLARE @team_id INT = (SELECT TOP 1 team_id FROM Team WHERE team_name = N'SEAL Coders' ORDER BY team_id DESC);
INSERT INTO TeamMember (team_id, user_role_id)
VALUES
(@team_id, @student_leader_role_id),
(@team_id, @student_member_role_id),
(@team_id, @student_third_member_role_id);

INSERT INTO Submission (team_id, round_id, repository_url, demo_url, slide_url, status)
VALUES (
    @team_id,
    @elim_round_id_2,
    'https://github.com/seal-demo/seal-coders',
    'https://youtu.be/demo-seal-coders',
    'https://docs.google.com/presentation/d/demo-seal-coders',
    'Evaluating'
);

DECLARE @submission_id INT = (SELECT TOP 1 submission_id FROM Submission ORDER BY submission_id DESC);
DECLARE @judge_assignment_id INT = (SELECT TOP 1 judge_assignment_id FROM JudgeAssignment ORDER BY judge_assignment_id DESC);

INSERT INTO Score (submission_id, criteria_id, judge_assignment_id, score_value, comment)
SELECT @submission_id, criteria_id, @judge_assignment_id,
       CASE criteria_name
           WHEN N'Problem-Solution Fit' THEN 8.50
           WHEN N'Implementation Quality' THEN 8.00
           ELSE 8.75
       END,
       N'Seed score for integration testing'
FROM ScoringCriteria
WHERE round_id = @elim_round_id_2;
GO

-- Verify seeded core data
SELECT user_id, username, email, status, is_approved
FROM [Users]
ORDER BY user_id;

SELECT event_id, name, status FROM HackathonEvent ORDER BY event_id DESC;
SELECT team_id, team_name, status FROM Team ORDER BY team_id DESC;
GO
