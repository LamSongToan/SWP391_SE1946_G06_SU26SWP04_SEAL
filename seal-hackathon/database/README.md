# Database Setup

The local SQL Server workflow is intentionally simple and fixed:

1. `seal_hackathon.sql`
2. `seed_test_data.sql`

## Usage

Run the scripts in SQL Server Management Studio in this exact order:

1. `seal_hackathon.sql`
2. `seed_test_data.sql`

`seal_hackathon.sql` drops and recreates `SEAL_Hackathon_G06` from scratch.

`seed_test_data.sql` inserts all shared demo data, including sample users,
teams, rounds, submissions, and audit log entries used by the UI.

## Team Policy

There are no active migration scripts in this repository anymore.

Whenever schema changes are pulled from Git, rerun the same 2 scripts above.

## Seed Password

All seeded accounts use:

```text
Password: Seal@2026
```

Use `email` for login. `username` remains profile data only.

## Demo Time Controls

The optional `database/demo/` folder contains flow-based SQL snapshots for the
main test journeys:

- event configuration
- team formation and round-1 submission
- judging, finalize, promote, and publish
- final publish and awards

For the full Summer 2026 timeline, use `database/demo/lifecycle/`.

For the simplified scenario folders and current-date refresh scripts, start
with:

- `database/demo/README.md`

For a full clean reset, rerun:

1. `seal_hackathon.sql`
2. `seed_test_data.sql`
