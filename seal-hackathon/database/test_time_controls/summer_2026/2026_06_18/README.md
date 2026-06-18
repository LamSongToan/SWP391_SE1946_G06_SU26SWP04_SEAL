# Summer 2026 Test Controls for 2026-06-18

These scripts are for an existing `SEAL_Hackathon_G06` database.

Run them in SSMS with:

```sql
USE SEAL_Hackathon_G06;
```

or simply execute the files directly because each file already includes `USE`.

## Scripts

1. `01_registration_open_on_2026_06_18.sql`
   - Opens registration on `18/06/2026`
   - Keeps the competition in the future
   - Good for testing student event registration

2. `02_submission_open_on_2026_06_18.sql`
   - Registration is already closed
   - Competition is already running on `18/06/2026`
   - `Elimination` submission is still open on `18/06/2026`
   - Good for testing student submission

3. `03_scoring_ready_on_2026_06_18.sql`
   - Closes registration before `18/06/2026`
   - Makes `Elimination` ready for judge scoring on `18/06/2026`
   - Keeps the final round in the future

4. `04_restore_seed_window.sql`
   - Restores the seeded Summer 2026 timeline from `seed_test_data.sql`

## Important

Do **not** rerun `seal_hackathon.sql` when the database already exists unless
you intentionally want to recreate everything from scratch.
