# Evaluation, Scoring, and Feedback API

This Sprint 2 continuation covers Judge Dashboard, Mentor Dashboard, Score Input Form, criterion-level score recording, and feedback history.

## Business Rules

- Judges score submissions using the `ScoringCriteria` configured for the submission round.
- Each judge's score is stored separately per submission and per criterion.
- A judge can save partial criterion scores as a `Draft`.
- Finalizing requires every criterion and locks that judge's evaluation.
- Coordinators can reopen finalized evaluations and can lock or reopen scoring at round level.
- Every score change is appended to `ScoreHistory` for audit.
- Score editing is blocked when `Round.score_locked = 1` or the event has reached `ResultPublished`, `Closed`, or `Cancelled`.
- Judges and mentors can add written feedback for assigned submissions.
- Feedback is append-only. Previous feedback entries remain available for audit and are not deleted.
- Student team members can view feedback linked to their own submissions.

## Database Migration

Run this on existing databases:

```text
database/evaluation_scoring_feedback_migration.sql
```

For teammates importing one combined update file, run:

```text
database/seal_team_update_all_in_one.sql
```

The migration adds:

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
| `PATCH` | `/api/coordinator/evaluations/{evaluationId}/reopen` | Coordinator | Move a finalized evaluation back to draft and audit the reopen action |
| `PATCH` | `/api/coordinator/rounds/{roundId}/score-lock` | Coordinator | Lock or reopen score editing for an entire round |
| `GET` | `/api/mentor/dashboard` | Mentor | List assigned tracks, teams, and submissions |
| `GET` | `/api/submissions/{submissionId}/feedback` | Student/Judge/Mentor/Coordinator | View feedback history for an authorized submission |
| `POST` | `/api/submissions/{submissionId}/feedback` | Judge/Mentor | Append written feedback |

## Score Submit Request

```json
{
  "scores": [
    {
      "criteriaId": 1,
      "scoreValue": 8.5,
      "comment": "Clear problem framing and feasible scope."
    }
  ],
  "feedbackText": "Strong demo flow. Improve deployment notes.",
  "finalizeScores": false
}
```

Draft requests may contain only the criteria currently entered. Set `finalizeScores` to `true` to complete the evaluation; finalization requires every criterion configured for the target round.

## Round Score Lock Request

```json
{
  "scoreLocked": true
}
```

Set `scoreLocked` to `false` when the coordinator reopens scoring for the round.

## Feedback Request

```json
{
  "feedbackText": "Please document the architecture decisions before finals."
}
```

Feedback entries are appended to `Feedback`; the API does not expose delete operations.
