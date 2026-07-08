# Demo Database Scenarios

These scripts do not recreate the database. They only adjust seeded data in
`SEAL_Hackathon_G06` so common workflow constraints can be tested quickly.

## Base Requirement

Run these first:

1. `../seal_hackathon.sql`
2. `../seed_test_data.sql`

## Available Scenarios

1. `01_registration_open.sql`
   - Registration window is open now.
   - Useful for team registration, track selection, and individual registration tests.

2. `02_submission_open_before_deadline.sql`
   - Registration is closed.
   - Elimination submission deadline is still in the future.
   - The seeded `SEAL Coders` submission is reset to editable state.

3. `03_submission_closed_scoring_open.sql`
   - Registration is closed.
   - Elimination submission deadline is already past.
   - The seeded `SEAL Coders` submission is reset to a clean scoring state for judges.

4. `04_create_fresh_student_huy.sql`
   - Creates a clean student test account if it does not exist yet.
   - Useful when you want one unused account for registration, team formation, and submission-flow testing
     without resetting the whole database.
   - Account:
     - Username: `huy.student`
     - Email: `huy.seal.demo@gmail.com`
     - Password: `Seal@2026`

5. `05_create_fresh_students_for_team_test.sql`
   - Creates two more clean student test accounts so you can immediately test 3-person team creation with
     `huy.student`.
   - Accounts:
     - Username: `minh.student`
     - Email: `minh.seal.demo@gmail.com`
     - Password: `Seal@2026`
     - Username: `dat.student`
     - Email: `dat.seal.demo@gmail.com`
     - Password: `Seal@2026`

6. `99_restore_seed_window.sql`
   - Restores the original date window from `seed_test_data.sql`.

## When To Use Full Reset

If the data is too messy, rerun:

1. `../seal_hackathon.sql`
2. `../seed_test_data.sql`
