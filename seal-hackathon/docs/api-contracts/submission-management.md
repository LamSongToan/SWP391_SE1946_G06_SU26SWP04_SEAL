# Submission Management API

Sprint 2 covers team submissions, submission validation, and submission history.

## Business Rules

- A team can have only one active submission per round.
- Only the team leader can create or update a submission.
- Team members can view their team's submissions and submission history.
- A submission requires a valid team with 3-5 members.
- The submitted round must belong to the same event as the team's selected track.
- Submissions are accepted only while the event is `Ongoing`.
- Submissions are rejected after the round `submissionDeadline`.
- For round order greater than 1, the team must have a qualified ranking in the previous round.
- `repositoryUrl` is required and must be a GitHub or GitLab repository URL.
- `demoUrl` and `slideUrl` are optional, but must be valid `http` or `https` URLs when provided.
- Updates create `SubmissionHistory` records instead of replacing the audit trail.

## Endpoints

All student endpoints require an approved student JWT. Coordinator endpoints require a coordinator JWT.

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/teams/{teamId}/submissions` | Student | List submissions for a team the signed-in student belongs to |
| `GET` | `/api/teams/{teamId}/submission-rounds` | Student | List event rounds with submission availability for a team |
| `POST` | `/api/teams/{teamId}/rounds/{roundId}/submission` | Student leader | Create a submission for a round |
| `GET` | `/api/submissions/{submissionId}` | Student member | View a submission |
| `PUT` | `/api/submissions/{submissionId}` | Student leader | Update a submission before evaluation starts and before deadline |
| `GET` | `/api/submissions/{submissionId}/history` | Student member | View submission history |
| `GET` | `/api/coordinator/events/{eventId}/submissions` | Coordinator | List all submissions in an event |

## Local Database Setup

For local development, recreate the database with:

```text
database/seal_hackathon.sql
database/seed_test_data.sql
```
