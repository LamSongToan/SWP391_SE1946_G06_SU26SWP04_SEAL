# Summer 2026 Time Controls

These scripts are for an existing `SEAL_Hackathon_G06` database.

Run them in SSMS with:

```sql
USE SEAL_Hackathon_G06;
```

or simply execute the files directly because each file already includes `USE`.

## Scripts

1. `01_open_registration.sql`
   - Opens registration for `SEAL Summer 2026`
   - Keeps the event in a pre-scoring phase
   - Good for testing student team registration

2. `02_scoring_on_2026_07_16.sql`
   - Sets Summer 2026 into a scoring-ready state for `2026-07-16`
   - Registration is already closed
   - Competition is still ongoing
   - Elimination is already finished
   - Finals submission deadline is before `2026-07-16`, so judges can score

3. `03_restore_seed_window.sql`
   - Restores the seeded Summer 2026 timeline from `seed_test_data.sql`

## Important

Do **not** rerun `seal_hackathon.sql` when the database already exists unless
you intentionally want to recreate everything from scratch.
