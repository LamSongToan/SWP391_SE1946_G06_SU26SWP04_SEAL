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
('huy.student', 'huy.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Huy Pham', NULL, N'Fresh student account kept unused in seed data for clean registration and team-flow testing.', 'Active', 1),
('minh.student', 'minh.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Minh Le', NULL, N'Fresh student account kept unused in seed data for clean team-formation testing.', 'Active', 1),
('dat.student', 'dat.seal.demo@gmail.com', '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu', N'Dat Nguyen', NULL, N'Fresh student account kept unused in seed data for clean team-formation testing.', 'Active', 1),
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
SELECT user_id, 'Student' FROM [Users] WHERE username IN ('an.student', 'linh.student', 'mai.student', 'bao.student', 'quynh.student', 'phuc.student', 'huy.student', 'minh.student', 'dat.student', 'nhat.student', 'thao.student', 'lam.student');
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
SELECT ur.user_role_id, 'FPT', 'SE181006', N'FPT University HCMC'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'huy.student' AND ur.role_type = 'Student';

INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
SELECT ur.user_role_id, 'FPT', 'SE181007', N'FPT University HCMC'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'minh.student' AND ur.role_type = 'Student';

INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
SELECT ur.user_role_id, 'FPT', 'SE181008', N'FPT University HCMC'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
WHERE u.username = 'dat.student' AND ur.role_type = 'Student';

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
-- Seed reusable Summer 2026 demo student accounts
-- =======================================================
DECLARE @summer_demo_students TABLE (
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    full_name NVARCHAR(150) NOT NULL,
    student_code VARCHAR(30) NOT NULL
);

INSERT INTO @summer_demo_students (username, email, full_name, student_code)
VALUES
('demo.web-velocity.1', 'web-velocity.1@seal.demo.local', N'Web Velocity Member 1', 'SDW001'),
('demo.web-velocity.2', 'web-velocity.2@seal.demo.local', N'Web Velocity Member 2', 'SDW002'),
('demo.web-velocity.3', 'web-velocity.3@seal.demo.local', N'Web Velocity Member 3', 'SDW003'),
('demo.pixel-raiders.1', 'pixel-raiders.1@seal.demo.local', N'Pixel Raiders Member 1', 'SDW004'),
('demo.pixel-raiders.2', 'pixel-raiders.2@seal.demo.local', N'Pixel Raiders Member 2', 'SDW005'),
('demo.pixel-raiders.3', 'pixel-raiders.3@seal.demo.local', N'Pixel Raiders Member 3', 'SDW006'),
('demo.sprint-canvas.1', 'sprint-canvas.1@seal.demo.local', N'Sprint Canvas Member 1', 'SDW007'),
('demo.sprint-canvas.2', 'sprint-canvas.2@seal.demo.local', N'Sprint Canvas Member 2', 'SDW008'),
('demo.sprint-canvas.3', 'sprint-canvas.3@seal.demo.local', N'Sprint Canvas Member 3', 'SDW009'),
('demo.urban-web-crew.1', 'urban-web-crew.1@seal.demo.local', N'Urban Web Crew Member 1', 'SDW010'),
('demo.urban-web-crew.2', 'urban-web-crew.2@seal.demo.local', N'Urban Web Crew Member 2', 'SDW011'),
('demo.urban-web-crew.3', 'urban-web-crew.3@seal.demo.local', N'Urban Web Crew Member 3', 'SDW012'),
('demo.ai-pioneers.1', 'ai-pioneers.1@seal.demo.local', N'AI Pioneers Member 1', 'SDA013'),
('demo.ai-pioneers.2', 'ai-pioneers.2@seal.demo.local', N'AI Pioneers Member 2', 'SDA014'),
('demo.ai-pioneers.3', 'ai-pioneers.3@seal.demo.local', N'AI Pioneers Member 3', 'SDA015'),
('demo.neural-forge.1', 'neural-forge.1@seal.demo.local', N'Neural Forge Member 1', 'SDA016'),
('demo.neural-forge.2', 'neural-forge.2@seal.demo.local', N'Neural Forge Member 2', 'SDA017'),
('demo.neural-forge.3', 'neural-forge.3@seal.demo.local', N'Neural Forge Member 3', 'SDA018'),
('demo.signal-stack.1', 'signal-stack.1@seal.demo.local', N'Signal Stack Member 1', 'SDA019'),
('demo.signal-stack.2', 'signal-stack.2@seal.demo.local', N'Signal Stack Member 2', 'SDA020'),
('demo.signal-stack.3', 'signal-stack.3@seal.demo.local', N'Signal Stack Member 3', 'SDA021'),
('demo.data-vision.1', 'data-vision.1@seal.demo.local', N'Data Vision Member 1', 'SDA022'),
('demo.data-vision.2', 'data-vision.2@seal.demo.local', N'Data Vision Member 2', 'SDA023'),
('demo.data-vision.3', 'data-vision.3@seal.demo.local', N'Data Vision Member 3', 'SDA024'),
('demo.flow-frontier.1', 'flow-frontier.1@seal.demo.local', N'Flow Frontier Member 1', 'SDW013'),
('demo.flow-frontier.2', 'flow-frontier.2@seal.demo.local', N'Flow Frontier Member 2', 'SDW014'),
('demo.flow-frontier.3', 'flow-frontier.3@seal.demo.local', N'Flow Frontier Member 3', 'SDW015'),
('demo.interface-union.1', 'interface-union.1@seal.demo.local', N'Interface Union Member 1', 'SDW016'),
('demo.interface-union.2', 'interface-union.2@seal.demo.local', N'Interface Union Member 2', 'SDW017'),
('demo.interface-union.3', 'interface-union.3@seal.demo.local', N'Interface Union Member 3', 'SDW018'),
('demo.portal-pulse.1', 'portal-pulse.1@seal.demo.local', N'Portal Pulse Member 1', 'SDW019'),
('demo.portal-pulse.2', 'portal-pulse.2@seal.demo.local', N'Portal Pulse Member 2', 'SDW020'),
('demo.portal-pulse.3', 'portal-pulse.3@seal.demo.local', N'Portal Pulse Member 3', 'SDW021'),
('demo.visionary-labs.1', 'visionary-labs.1@seal.demo.local', N'Visionary Labs Member 1', 'SDA025'),
('demo.visionary-labs.2', 'visionary-labs.2@seal.demo.local', N'Visionary Labs Member 2', 'SDA026'),
('demo.visionary-labs.3', 'visionary-labs.3@seal.demo.local', N'Visionary Labs Member 3', 'SDA027'),
('demo.tensor-titans.1', 'tensor-titans.1@seal.demo.local', N'Tensor Titans Member 1', 'SDA028'),
('demo.tensor-titans.2', 'tensor-titans.2@seal.demo.local', N'Tensor Titans Member 2', 'SDA029'),
('demo.tensor-titans.3', 'tensor-titans.3@seal.demo.local', N'Tensor Titans Member 3', 'SDA030'),
('demo.model-mavericks.1', 'model-mavericks.1@seal.demo.local', N'Model Mavericks Member 1', 'SDA031'),
('demo.model-mavericks.2', 'model-mavericks.2@seal.demo.local', N'Model Mavericks Member 2', 'SDA032'),
('demo.model-mavericks.3', 'model-mavericks.3@seal.demo.local', N'Model Mavericks Member 3', 'SDA033'),
('demo.insight-ops.1', 'insight-ops.1@seal.demo.local', N'Insight Ops Member 1', 'SDA034'),
('demo.insight-ops.2', 'insight-ops.2@seal.demo.local', N'Insight Ops Member 2', 'SDA035'),
('demo.insight-ops.3', 'insight-ops.3@seal.demo.local', N'Insight Ops Member 3', 'SDA036');

INSERT INTO [Users] (username, email, password_hash, full_name, avatar_url, bio, status, is_approved)
SELECT
    s.username,
    s.email,
    '$2a$10$YTjZK23.EGEb.vCcgZv.0.qm9EQQmZFis7DpEYSUdTai/6wPaK1Vu',
    s.full_name,
    NULL,
    N'Reusable demo student account for Summer 2026 lifecycle scenarios.',
    'Active',
    1
FROM @summer_demo_students s;

INSERT INTO UserRole (user_id, role_type)
SELECT u.user_id, 'Student'
FROM [Users] u
JOIN @summer_demo_students s ON s.username = u.username;

INSERT INTO StudentProfile (user_role_id, student_type, student_code, university_name)
SELECT ur.user_role_id, 'FPT', s.student_code, N'FPT University HCMC'
FROM UserRole ur
JOIN [Users] u ON u.user_id = ur.user_id
JOIN @summer_demo_students s ON s.username = u.username
WHERE ur.role_type = 'Student';
GO

-- =======================================================
-- Seed Spring 2026 event with participating teams
-- =======================================================
INSERT INTO HackathonEvent (
    name, semester, year, start_date, end_date,
    registration_start_at, registration_end_at,
    competition_start_at, competition_end_at,
    track_selection_mode, min_team_size, max_team_size, ranking_method, awards_json,
    published_at, status, description
)
VALUES (
    N'SEAL Spring 2026', 'Spring', 2026, '2026-02-10', '2026-04-20',
    '2026-02-01T08:00:00', '2026-02-08T23:59:00',
    '2026-02-10T08:00:00', '2026-04-20T18:00:00',
    'TEAM_SELECT', 3, 5, 'FINAL_SCORE', N'[{"awardName":"Champion","quantity":1,"prizeAmountVnd":15000000},{"awardName":"Runner-up","quantity":1,"prizeAmountVnd":8000000}]',
    '2026-01-28T09:00:00', 'Ended', N'Completed Spring 2026 event with finalized rounds, rankings, and awards for demo testing'
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
DECLARE @spring_web_mentor_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'kiet.mentor' AND ur.role_type = 'Mentor'
);
DECLARE @spring_ai_mentor_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'vy.mentor' AND ur.role_type = 'Mentor'
);
DECLARE @spring_web_judge_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'hao.judge' AND ur.role_type = 'Judge'
);
DECLARE @spring_ai_judge_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'trinh.judge' AND ur.role_type = 'Judge'
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

INSERT INTO Track (event_id, name, min_teams, max_teams)
VALUES
(@spring_event_id, N'Web Platform', 1, 3),
(@spring_event_id, N'AI & Data', 1, 3);

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
DECLARE @spring_final_round_id INT = (
    SELECT TOP 1 round_id
    FROM Round
    WHERE event_id = @spring_event_id AND round_name = N'Finals'
    ORDER BY round_id DESC
);

INSERT INTO ScoringCriteria (round_id, criteria_name, weight, criteria_type)
VALUES
(@spring_round_id, N'Problem-Solution Fit', 35.00, 'Technical'),
(@spring_round_id, N'Implementation Quality', 35.00, 'Technical'),
(@spring_round_id, N'Presentation', 30.00, 'SoftSkill'),
(@spring_final_round_id, N'Innovation Impact', 35.00, 'Technical'),
(@spring_final_round_id, N'Product Readiness', 35.00, 'Technical'),
(@spring_final_round_id, N'Judge Q&A', 30.00, 'SoftSkill');

INSERT INTO EventCoordinatorAssignment (event_id, user_role_id)
VALUES (@spring_event_id, @spring_coordinator_role_id);

INSERT INTO TrackMentor (track_id, user_role_id)
VALUES
(@spring_track_web_id, @spring_web_mentor_role_id),
(@spring_track_ai_id, @spring_ai_mentor_role_id);

INSERT INTO JudgeAssignment (round_id, track_id, user_role_id)
VALUES
(@spring_round_id, @spring_track_web_id, @spring_web_judge_role_id),
(@spring_round_id, @spring_track_ai_id, @spring_ai_judge_role_id),
(@spring_final_round_id, @spring_track_web_id, @spring_web_judge_role_id),
(@spring_final_round_id, @spring_track_ai_id, @spring_ai_judge_role_id);

INSERT INTO Team (track_id, user_role_id, team_name, join_code, status, created_at)
VALUES
(@spring_track_web_id, @spring_student_leader_role_id, N'Spring Web Sparks', 'SPW2026', 'Ready', '2026-02-08T10:15:00'),
(@spring_track_ai_id, @spring_student_ai_leader_role_id, N'Spring AI Builders', 'SPA2026', 'Ready', '2026-02-08T10:40:00');

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

DECLARE @spring_web_qualifier_assignment_id INT = (
    SELECT TOP 1 judge_assignment_id
    FROM JudgeAssignment
    WHERE round_id = @spring_round_id
      AND track_id = @spring_track_web_id
      AND user_role_id = @spring_web_judge_role_id
    ORDER BY judge_assignment_id DESC
);
DECLARE @spring_ai_qualifier_assignment_id INT = (
    SELECT TOP 1 judge_assignment_id
    FROM JudgeAssignment
    WHERE round_id = @spring_round_id
      AND track_id = @spring_track_ai_id
      AND user_role_id = @spring_ai_judge_role_id
    ORDER BY judge_assignment_id DESC
);
DECLARE @spring_web_final_assignment_id INT = (
    SELECT TOP 1 judge_assignment_id
    FROM JudgeAssignment
    WHERE round_id = @spring_final_round_id
      AND track_id = @spring_track_web_id
      AND user_role_id = @spring_web_judge_role_id
    ORDER BY judge_assignment_id DESC
);
DECLARE @spring_ai_final_assignment_id INT = (
    SELECT TOP 1 judge_assignment_id
    FROM JudgeAssignment
    WHERE round_id = @spring_final_round_id
      AND track_id = @spring_track_ai_id
      AND user_role_id = @spring_ai_judge_role_id
    ORDER BY judge_assignment_id DESC
);

INSERT INTO Submission (
    team_id, round_id, repository_url, demo_url, slide_url,
    status, submitted_at, updated_at, submitted_by_user_role_id
)
VALUES
(@spring_web_team_id, @spring_round_id, 'https://github.com/seal-demo/spring-web-sparks-q', 'https://youtu.be/spring-web-sparks-q', 'https://docs.google.com/presentation/d/spring-web-sparks-q', 'Qualified', '2026-03-14T19:00:00', '2026-03-16T09:00:00', @spring_student_leader_role_id),
(@spring_ai_team_id, @spring_round_id, 'https://github.com/seal-demo/spring-ai-builders-q', 'https://youtu.be/spring-ai-builders-q', 'https://docs.google.com/presentation/d/spring-ai-builders-q', 'Qualified', '2026-03-14T20:00:00', '2026-03-16T09:15:00', @spring_student_ai_leader_role_id),
(@spring_web_team_id, @spring_final_round_id, 'https://github.com/seal-demo/spring-web-sparks-final', 'https://youtu.be/spring-web-sparks-final', 'https://docs.google.com/presentation/d/spring-web-sparks-final', 'Finalized', '2026-04-18T10:30:00', '2026-04-20T18:05:00', @spring_student_leader_role_id),
(@spring_ai_team_id, @spring_final_round_id, 'https://github.com/seal-demo/spring-ai-builders-final', 'https://youtu.be/spring-ai-builders-final', 'https://docs.google.com/presentation/d/spring-ai-builders-final', 'Finalized', '2026-04-18T11:00:00', '2026-04-20T18:10:00', @spring_student_ai_leader_role_id);

DECLARE @spring_web_qualifier_submission_id INT = (
    SELECT TOP 1 submission_id
    FROM Submission
    WHERE team_id = @spring_web_team_id AND round_id = @spring_round_id
    ORDER BY submission_id DESC
);
DECLARE @spring_ai_qualifier_submission_id INT = (
    SELECT TOP 1 submission_id
    FROM Submission
    WHERE team_id = @spring_ai_team_id AND round_id = @spring_round_id
    ORDER BY submission_id DESC
);
DECLARE @spring_web_final_submission_id INT = (
    SELECT TOP 1 submission_id
    FROM Submission
    WHERE team_id = @spring_web_team_id AND round_id = @spring_final_round_id
    ORDER BY submission_id DESC
);
DECLARE @spring_ai_final_submission_id INT = (
    SELECT TOP 1 submission_id
    FROM Submission
    WHERE team_id = @spring_ai_team_id AND round_id = @spring_final_round_id
    ORDER BY submission_id DESC
);

INSERT INTO JudgeEvaluation (submission_id, judge_assignment_id, status, finalized_at, created_at, updated_at)
VALUES
(@spring_web_qualifier_submission_id, @spring_web_qualifier_assignment_id, 'Finalized', '2026-03-16T09:00:00', '2026-03-15T08:00:00', '2026-03-16T09:00:00'),
(@spring_ai_qualifier_submission_id, @spring_ai_qualifier_assignment_id, 'Finalized', '2026-03-16T09:15:00', '2026-03-15T08:00:00', '2026-03-16T09:15:00'),
(@spring_web_final_submission_id, @spring_web_final_assignment_id, 'Finalized', '2026-04-20T18:05:00', '2026-04-18T12:00:00', '2026-04-20T18:05:00'),
(@spring_ai_final_submission_id, @spring_ai_final_assignment_id, 'Finalized', '2026-04-20T18:10:00', '2026-04-18T12:00:00', '2026-04-20T18:10:00');

INSERT INTO Score (submission_id, criteria_id, judge_assignment_id, score_value, comment, scored_at)
SELECT @spring_web_qualifier_submission_id, criteria_id, @spring_web_qualifier_assignment_id,
       CASE criteria_name
           WHEN N'Problem-Solution Fit' THEN 8.40
           WHEN N'Implementation Quality' THEN 8.35
           ELSE 8.70
       END,
       N'Spring qualifier score - Web Platform',
       '2026-03-16T09:00:00'
FROM ScoringCriteria
WHERE round_id = @spring_round_id;

INSERT INTO Score (submission_id, criteria_id, judge_assignment_id, score_value, comment, scored_at)
SELECT @spring_ai_qualifier_submission_id, criteria_id, @spring_ai_qualifier_assignment_id,
       CASE criteria_name
           WHEN N'Problem-Solution Fit' THEN 8.95
           WHEN N'Implementation Quality' THEN 8.85
           ELSE 9.05
       END,
       N'Spring qualifier score - AI & Data',
       '2026-03-16T09:15:00'
FROM ScoringCriteria
WHERE round_id = @spring_round_id;

INSERT INTO Score (submission_id, criteria_id, judge_assignment_id, score_value, comment, scored_at)
SELECT @spring_web_final_submission_id, criteria_id, @spring_web_final_assignment_id,
       CASE criteria_name
           WHEN N'Innovation Impact' THEN 8.80
           WHEN N'Product Readiness' THEN 8.75
           ELSE 9.00
       END,
       N'Spring final score - Web Platform',
       '2026-04-20T18:05:00'
FROM ScoringCriteria
WHERE round_id = @spring_final_round_id;

INSERT INTO Score (submission_id, criteria_id, judge_assignment_id, score_value, comment, scored_at)
SELECT @spring_ai_final_submission_id, criteria_id, @spring_ai_final_assignment_id,
       CASE criteria_name
           WHEN N'Innovation Impact' THEN 9.25
           WHEN N'Product Readiness' THEN 9.10
           ELSE 9.20
       END,
       N'Spring final score - AI & Data',
       '2026-04-20T18:10:00'
FROM ScoringCriteria
WHERE round_id = @spring_final_round_id;

INSERT INTO Prize (event_id, prize_name, amount_vnd)
VALUES
(@spring_event_id, N'Champion', 15000000),
(@spring_event_id, N'Runner-up', 8000000);

DECLARE @spring_champion_prize_id INT = (
    SELECT TOP 1 prize_id
    FROM Prize
    WHERE event_id = @spring_event_id AND prize_name = N'Champion'
    ORDER BY prize_id DESC
);
DECLARE @spring_runner_up_prize_id INT = (
    SELECT TOP 1 prize_id
    FROM Prize
    WHERE event_id = @spring_event_id AND prize_name = N'Runner-up'
    ORDER BY prize_id DESC
);

INSERT INTO Ranking (
    team_id, round_id, prize_id, rank_position, total_score,
    qualified_next_round, calculated_at, qualification_status, qualification_note, qualification_calculated_at
)
VALUES
(@spring_ai_team_id, @spring_round_id, NULL, 1, 8.95, 1, '2026-03-16T09:20:00', 'Qualified', N'Qualified to Finals as a top submission.', '2026-03-16T09:20:00'),
(@spring_web_team_id, @spring_round_id, NULL, 2, 8.48, 1, '2026-03-16T09:20:00', 'Qualified', N'Qualified to Finals as a top submission.', '2026-03-16T09:20:00'),
(@spring_ai_team_id, @spring_final_round_id, @spring_champion_prize_id, 1, 9.18, 0, '2026-04-20T18:20:00', 'Not Applicable', N'Champion after final round publication.', '2026-04-20T18:20:00'),
(@spring_web_team_id, @spring_final_round_id, @spring_runner_up_prize_id, 2, 8.85, 0, '2026-04-20T18:20:00', 'Not Applicable', N'Runner-up after final round publication.', '2026-04-20T18:20:00');

INSERT INTO TeamPrize (team_id, prize_id, awarded_at)
VALUES
(@spring_ai_team_id, @spring_champion_prize_id, '2026-04-20T18:30:00'),
(@spring_web_team_id, @spring_runner_up_prize_id, '2026-04-20T18:30:00');

UPDATE Round
SET score_locked = 1
WHERE round_id IN (@spring_round_id, @spring_final_round_id);
GO

-- =======================================================
-- Seed event, track, rounds, criteria
-- =======================================================
INSERT INTO HackathonEvent (
    name, semester, year, start_date, end_date,
    registration_start_at, registration_end_at,
    competition_start_at, competition_end_at,
    track_selection_mode, min_team_size, max_team_size, ranking_method, awards_json,
    published_at, status, description
)
VALUES (
    N'SEAL Summer 2026', 'Summer', 2026, '2026-06-15', '2026-07-20',
    '2026-06-10T08:00:00', '2026-06-25T23:59:00',
    '2026-06-15T08:00:00', '2026-07-20T18:00:00',
    'TEAM_SELECT', 3, 5, 'FINAL_SCORE', N'[{"awardName":"Champion","quantity":1,"prizeAmountVnd":20000000},{"awardName":"Runner-up","quantity":1,"prizeAmountVnd":10000000}]',
    '2026-06-08T10:00:00', 'Ongoing', N'Official seeded event for sprint integration testing'
);
GO

DECLARE @event_id INT = (SELECT TOP 1 event_id FROM HackathonEvent WHERE name = N'SEAL Summer 2026' ORDER BY event_id DESC);

INSERT INTO Track (event_id, name, min_teams, max_teams)
VALUES
(@event_id, N'Web Platform', 8, 10),
(@event_id, N'AI & Data', 8, 10);
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
DECLARE @summer_final_round_id INT = (
    SELECT TOP 1 round_id FROM Round WHERE round_name = N'Finals' ORDER BY round_id DESC
);

INSERT INTO ScoringCriteria (round_id, criteria_name, weight, criteria_type)
VALUES
(@elim_round_id, N'Problem-Solution Fit', 30.00, 'Technical'),
(@elim_round_id, N'Implementation Quality', 40.00, 'Technical'),
(@elim_round_id, N'Presentation', 30.00, 'SoftSkill');

INSERT INTO ScoringCriteria (round_id, criteria_name, weight, criteria_type)
VALUES
(@summer_final_round_id, N'Presentation', 25.00, 'Presentation'),
(@summer_final_round_id, N'Q&A', 25.00, 'Q&A'),
(@summer_final_round_id, N'Product Demo', 25.00, 'Product Demo'),
(@summer_final_round_id, N'Business Impact', 25.00, 'Business Impact');
GO

-- =======================================================
-- Seed reusable Summer 2026 assignments only
-- =======================================================
DECLARE @summer_event_id INT = (
    SELECT TOP 1 event_id
    FROM HackathonEvent
    WHERE name = N'SEAL Summer 2026'
    ORDER BY event_id DESC
);
DECLARE @summer_round_id INT = (
    SELECT TOP 1 round_id
    FROM Round
    WHERE event_id = @summer_event_id
      AND round_name = N'Elimination'
    ORDER BY round_id DESC
);
DECLARE @summer_track_web_id INT = (
    SELECT TOP 1 track_id
    FROM Track
    WHERE event_id = @summer_event_id
      AND name = N'Web Platform'
    ORDER BY track_id DESC
);
DECLARE @summer_track_ai_id INT = (
    SELECT TOP 1 track_id
    FROM Track
    WHERE event_id = @summer_event_id
      AND name = N'AI & Data'
    ORDER BY track_id DESC
);
DECLARE @summer_elimination_round_id INT = (
    SELECT TOP 1 round_id
    FROM Round
    WHERE event_id = @summer_event_id
      AND round_name = N'Elimination'
    ORDER BY round_id DESC
);
DECLARE @summer_final_round_id_2 INT = (
    SELECT TOP 1 round_id
    FROM Round
    WHERE event_id = @summer_event_id
      AND round_name = N'Finals'
    ORDER BY round_id DESC
);
DECLARE @summer_web_mentor_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'kiet.mentor' AND ur.role_type = 'Mentor'
);
DECLARE @summer_ai_mentor_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'vy.mentor' AND ur.role_type = 'Mentor'
);
DECLARE @summer_web_judge_role_1 INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'ngon.judge' AND ur.role_type = 'Judge'
);
DECLARE @summer_web_judge_role_2 INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'hao.judge' AND ur.role_type = 'Judge'
);
DECLARE @summer_ai_judge_role_1 INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'trinh.judge' AND ur.role_type = 'Judge'
);
DECLARE @summer_ai_judge_role_2 INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'ngon.judge' AND ur.role_type = 'Judge'
);
DECLARE @summer_coordinator_role_id INT = (
    SELECT TOP 1 ur.user_role_id
    FROM UserRole ur
    JOIN [Users] u ON u.user_id = ur.user_id
    WHERE u.username = 'toan.coordinator' AND ur.role_type = 'Coordinator'
);

INSERT INTO TrackMentor (track_id, user_role_id)
VALUES
(@summer_track_web_id, @summer_web_mentor_role_id),
(@summer_track_ai_id, @summer_ai_mentor_role_id);

INSERT INTO JudgeAssignment (round_id, track_id, user_role_id)
VALUES
(@summer_elimination_round_id, @summer_track_web_id, @summer_web_judge_role_1),
(@summer_elimination_round_id, @summer_track_web_id, @summer_web_judge_role_2),
(@summer_elimination_round_id, @summer_track_ai_id, @summer_ai_judge_role_1),
(@summer_elimination_round_id, @summer_track_ai_id, @summer_ai_judge_role_2),
(@summer_final_round_id_2, @summer_track_web_id, @summer_web_judge_role_1),
(@summer_final_round_id_2, @summer_track_web_id, @summer_web_judge_role_2),
(@summer_final_round_id_2, @summer_track_ai_id, @summer_ai_judge_role_1),
(@summer_final_round_id_2, @summer_track_ai_id, @summer_ai_judge_role_2);

INSERT INTO EventCoordinatorAssignment (event_id, user_role_id)
VALUES (@summer_event_id, @summer_coordinator_role_id);
GO

-- Verify seeded core data
SELECT user_id, username, email, status, is_approved
FROM [Users]
ORDER BY user_id;

SELECT event_id, name, status FROM HackathonEvent ORDER BY event_id DESC;
SELECT team_id, team_name, status FROM Team ORDER BY team_id DESC;
GO

-- =======================================================
-- Sample Audit Logs for UI/demo verification
-- =======================================================
DECLARE @AuditActorUserId INT;
DECLARE @AuditEventId INT;
DECLARE @AuditEventName NVARCHAR(150);
DECLARE @AuditTrackId INT;
DECLARE @AuditTrackName NVARCHAR(100);
DECLARE @AuditRoundId INT;
DECLARE @AuditRoundName NVARCHAR(100);
DECLARE @AuditTeamId INT;
DECLARE @AuditTeamName NVARCHAR(100);
DECLARE @AuditSubmissionId INT;

SELECT TOP 1 @AuditActorUserId = u.user_id
FROM [Users] u
JOIN UserRole ur ON ur.user_id = u.user_id
WHERE ur.role_type = 'Coordinator'
ORDER BY CASE WHEN u.username = 'toan.coordinator' THEN 0 ELSE 1 END, u.user_id;

IF @AuditActorUserId IS NULL
BEGIN
    SELECT TOP 1 @AuditActorUserId = user_id
    FROM [Users]
    ORDER BY user_id;
END

SELECT TOP 1
    @AuditEventId = event_id,
    @AuditEventName = name
FROM HackathonEvent
ORDER BY event_id;

SELECT TOP 1
    @AuditTrackId = track_id,
    @AuditTrackName = name
FROM Track
WHERE @AuditEventId IS NULL OR event_id = @AuditEventId
ORDER BY track_id;

SELECT TOP 1
    @AuditRoundId = round_id,
    @AuditRoundName = round_name
FROM [Round]
WHERE @AuditEventId IS NULL OR event_id = @AuditEventId
ORDER BY round_order, round_id;

SELECT TOP 1
    @AuditTeamId = team_id,
    @AuditTeamName = team_name
FROM Team
WHERE @AuditTrackId IS NULL OR track_id = @AuditTrackId
ORDER BY team_id;

SELECT TOP 1
    @AuditSubmissionId = submission_id
FROM Submission
WHERE (@AuditTeamId IS NULL OR team_id = @AuditTeamId)
   OR (@AuditRoundId IS NULL OR round_id = @AuditRoundId)
ORDER BY submission_id;

IF @AuditActorUserId IS NULL
BEGIN
    THROW 51001, 'Cannot seed AuditLog samples because there is no user in [Users].', 1;
END

IF NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: event update')
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
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @AuditActorUserId,
        'EVENT_UPDATED',
        'EVENT',
        @AuditEventId,
        COALESCE(@AuditEventName, N'Sample Event'),
        N'{"status":"Draft","trackSelectionMode":"Teams choose their track"}',
        N'{"status":"Ongoing","trackSelectionMode":"System assigns track automatically (balanced)"}',
        N'Sample audit log seed: event update',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -55, GETDATE())
    );
END

IF @AuditTrackId IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: track update')
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
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @AuditActorUserId,
        'TRACK_UPDATED',
        'TRACK',
        @AuditTrackId,
        @AuditTrackName,
        N'{"name":"Web Platform","minTeams":2,"maxTeams":8}',
        N'{"name":"Web Platform","minTeams":3,"maxTeams":10}',
        N'Sample audit log seed: track update',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -42, GETDATE())
    );
END

IF @AuditRoundId IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: round update')
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
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @AuditActorUserId,
        'ROUND_UPDATED',
        'ROUND',
        @AuditRoundId,
        @AuditRoundName,
        N'{"roundName":"Elimination","promotionRuleTopN":2,"scoreLocked":false}',
        N'{"roundName":"Elimination","promotionRuleTopN":3,"scoreLocked":false}',
        N'Sample audit log seed: round update',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -31, GETDATE())
    );
END

IF @AuditTeamId IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: team registration')
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
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @AuditActorUserId,
        'TEAM_REGISTERED_FOR_EVENT',
        'TEAM',
        @AuditTeamId,
        @AuditTeamName,
        NULL,
        N'{"status":"Forming","membershipValid":true,"trackAssigned":true}',
        N'Sample audit log seed: team registration',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -24, GETDATE())
    );
END

IF @AuditSubmissionId IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: submission update')
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
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @AuditActorUserId,
        'SUBMISSION_UPDATED',
        'SUBMISSION',
        @AuditSubmissionId,
        COALESCE(@AuditTeamName, N'Sample Submission'),
        N'{"repositoryUrl":"https://github.com/demo/old-repo","status":"Submitted"}',
        N'{"repositoryUrl":"https://github.com/demo/new-repo","status":"Evaluating"}',
        N'Sample audit log seed: submission update',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -12, GETDATE())
    );
END

IF NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: account approval')
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
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @AuditActorUserId,
        'ACCOUNT_APPROVED',
        'USER',
        @AuditActorUserId,
        N'Toan Tran',
        N'{"status":"PendingApproval","approved":false}',
        N'{"status":"Active","approved":true}',
        N'Sample audit log seed: account approval',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -5, GETDATE())
    );
END

IF @AuditEventId IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM AuditLog WHERE reason = N'Sample audit log seed: announcement sent')
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
        ip_address,
        device_info,
        timestamp
    )
    VALUES (
        @AuditActorUserId,
        'ANNOUNCEMENT_SENT',
        'EVENT',
        @AuditEventId,
        @AuditEventName,
        NULL,
        N'{"title":"Registration reminder","message":"Please complete team registration before the deadline.","audience":"ALL","recipientCount":12}',
        N'Sample audit log seed: announcement sent',
        '127.0.0.1',
        N'SEAL sample seed',
        DATEADD(MINUTE, -2, GETDATE())
    );
END

-- Backward-compatible promotion setup: existing seeded rounds used one Top N.
-- Materialize that value per track so each rule can be edited independently later.
INSERT INTO RoundTrackPromotionRule (round_id, track_id, top_n)
SELECT r.round_id, t.track_id, r.promotion_rule_top_n
FROM [Round] r
JOIN Track t ON t.event_id = r.event_id
WHERE r.is_final = 0
  AND r.promotion_rule_top_n IS NOT NULL
  AND r.promotion_rule_top_n >= 1
  AND NOT EXISTS (
      SELECT 1
      FROM RoundTrackPromotionRule promotion_rule
      WHERE promotion_rule.round_id = r.round_id
        AND promotion_rule.track_id = t.track_id
  );
GO
