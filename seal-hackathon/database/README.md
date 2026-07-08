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

The optional `database/demo/` folder contains quick data-reset scripts for
workflow testing such as:

- registration window open
- submission window open before deadline
- submission closed so judge scoring becomes available
- restore the original seed schedule

Use those scripts only when you want to keep the current database and quickly
switch test scenarios. For a full clean reset, rerun:

1. `seal_hackathon.sql`
2. `seed_test_data.sql`
