USE SEAL_Hackathon_G06;
GO

-- =======================================================
-- Seed users (for email login system testing)
-- Password for all seeded users: Seal@2026.
-- =======================================================
INSERT INTO [Users] (username, email, password_hash, full_name, avatar_url, bio, status, is_approved)
VALUES
('an.student', 'an.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Nguyen Van An', NULL, N'FPT Software Engineering student focused on product execution and team coordination.', 'Active', 1),
('toan.coordinator', 'toan.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Toan Tran', NULL, N'Coordinator for event operations, participant approval, and seasonal planning.', 'Active', 1),
('kiet.mentor', 'kiet.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Kiet Le', NULL, N'Mentor supporting web architecture, product direction, and technical tradeoffs.', 'Active', 1),
('ngon.judge', 'ngon.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Ngon Pham', NULL, N'Guest judge reviewing implementation quality, product value, and presentation.', 'Active', 1),
('linh.student', 'linh.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Linh Vo', NULL, N'External student interested in cross-university collaboration and applied software delivery.', 'Active', 1),
('mai.student', 'mai.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Mai Nguyen', NULL, N'FPT student with interest in frontend polish, user experience, and rapid iteration.', 'Active', 1);
GO

INSERT INTO UserRole (user_id, role_type)
SELECT user_id, 'Student' FROM [Users] WHERE username IN ('an.student', 'linh.student', 'mai.student');
INSERT INTO UserRole (user_id, role_type)
SELECT user_id, 'Coordinator' FROM [Users] WHERE username = 'toan.coordinator';
INSERT INTO UserRole (user_id, role_type)
SELECT user_id, 'Mentor' FROM [Users] WHERE username = 'kiet.mentor';
INSERT INTO UserRole (user_id, role_type)
SELECT user_id, 'Judge' FROM [Users] WHERE username = 'ngon.judge';
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

INSERT INTO CoordinatorProfile (user_role_id, staff_type)
SELECT ur.user_role_id, 'SE Dept'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'toan.coordinator' AND ur.role_type = 'Coordinator';

INSERT INTO MentorProfile (user_role_id, department, specialization)
SELECT ur.user_role_id, N'Software Engineering', N'Web Architecture'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'kiet.mentor' AND ur.role_type = 'Mentor';

INSERT INTO JudgeProfile (user_role_id, judge_type, organization)
SELECT ur.user_role_id, 'Guest', N'FPT Software'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'ngon.judge' AND ur.role_type = 'Judge';
GO

-- =======================================================
-- Seed event, track, rounds, criteria
-- =======================================================
INSERT INTO HackathonEvent (name, season, year, start_date, end_date, status, description)
VALUES (N'SEAL Summer 2026', 'Summer', 2026, '2026-06-15', '2026-07-20', 'RegistrationOpen', N'Official seeded event for sprint integration testing');
GO

DECLARE @event_id INT = (SELECT TOP 1 event_id FROM HackathonEvent WHERE name = N'SEAL Summer 2026' ORDER BY event_id DESC);

INSERT INTO Track (event_id, name)
VALUES
(@event_id, N'Web Platform'),
(@event_id, N'AI & Data');
GO

DECLARE @event_id_2 INT = (SELECT TOP 1 event_id FROM HackathonEvent WHERE name = N'SEAL Summer 2026' ORDER BY event_id DESC);

INSERT INTO Round (event_id, round_name, round_order, submission_deadline, promotion_rule_top_n)
VALUES
(@event_id_2, N'Elimination', 1, '2026-06-30T23:59:00', 2),
(@event_id_2, N'Finals', 2, '2026-07-18T23:59:00', 1);
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

SELECT event_id, name, season, year, status FROM HackathonEvent ORDER BY event_id DESC;
SELECT team_id, team_name, status FROM Team ORDER BY team_id DESC;
GO
