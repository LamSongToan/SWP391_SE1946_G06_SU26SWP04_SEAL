# Evaluation, Scoring, and Feedback API

This Sprint 2 continuation covers Judge Dashboard, Mentor Dashboard, Score Input Form, criterion-level score recording, and feedback history.

## Business Rules

- Judges score submissions using the `ScoringCriteria` configured for the submission round.
- Each judge's score is stored separately per submission and per criterion.
- A judge can save partial criterion scores as a `Draft`; draft scores are not counted as submitted for coordinator round finalization.
- Submitting to the coordinator requires every criterion and marks the evaluation as `Finalized` without locking score editing.
- Judges can revise submitted scores until the coordinator finalizes the round. Saving a revision as a draft changes the evaluation back to `Draft`, so it must be submitted again.
- Coordinator round finalization sets `Round.score_locked = 1`, which is the authoritative score-editing lock.
- Every score change is appended to `ScoreHistory` for audit.
- Score editing is blocked when `Round.score_locked = 1` or the event has reached `ResultPublished`, `Closed`, or `Cancelled`.
- Judges and mentors can add written feedback for assigned submissions.
- Feedback is append-only. Previous feedback entries remain available for audit and are not deleted.
- Student team members can view feedback linked to their own submissions.

## Local Database Setup

For local development, recreate the database with:

```text
database/seal_hackathon.sql
database/seed_test_data.sql
```

The base schema and seed data include:

- `Round.score_locked`
- `Feedback`
- `UQ_Score_Submission_Criteria_Judge`
- `JudgeEvaluation` with `Draft` and `Finalized` states
- append-only `ScoreHistory`

## Endpoints

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/judge/dashboard` | Judge | List assigned rounds and assigned submissions |
| `GET` | `/api/judge/submissions/{submissionId}/score-form` | Judge | Load the round-specific rubric and existing judge scores |
| `POST` | `/api/judge/submissions/{submissionId}/scores` | Judge | Create/update criterion-level scores for the current judge |
| `PATCH` | `/api/coordinator/evaluations/{evaluationId}/reopen` | Coordinator | Compatibility action that moves a submitted evaluation back to draft and audits the change |
| `PATCH` | `/api/coordinator/rounds/{roundId}/score-lock` | Coordinator | Lock or reopen score editing for an entire round |
| `GET` | `/api/mentor/dashboard` | Mentor | List assigned tracks, teams, and submissions |
| `GET` | `/api/submissions/{submissionId}/feedback` | Student/Judge/Mentor/Coordinator | View feedback history for an authorized submission |
| `POST` | `/api/submissions/{submissionId}/feedback` | Judge/Mentor | Append written feedback |
