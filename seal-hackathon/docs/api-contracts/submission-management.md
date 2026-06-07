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

## Create / Update Request

```json
{
  "repositoryUrl": "https://github.com/seal/team-product",
  "demoUrl": "https://demo.example.com",
  "slideUrl": "https://docs.google.com/presentation/d/example"
}
```

## Submission Response

```json
{
  "success": true,
  "message": "Submission created",
  "data": {
    "submissionId": 12,
    "teamId": 5,
    "teamName": "Agile Seals",
    "eventId": 2,
    "eventName": "SEAL Summer 2026",
    "trackId": 4,
    "trackName": "Emerging Technologies",
    "roundId": 8,
    "roundName": "Elimination",
    "roundOrder": 1,
    "submissionDeadline": "2026-06-30T23:59:00",
    "repositoryUrl": "https://github.com/seal/team-product",
    "demoUrl": "https://demo.example.com",
    "slideUrl": "https://docs.google.com/presentation/d/example",
    "status": "Submitted",
    "submittedAt": "2026-06-07T10:15:30",
    "updatedAt": "2026-06-07T10:15:30",
    "submittedByUserRoleId": 31,
    "submittedByName": "Team Leader",
    "currentUserLeader": true,
    "editable": true
  },
  "errorCode": null,
  "timestamp": "2026-06-07T03:15:30Z"
}
```

## History Response Item

```json
{
  "historyId": 20,
  "submissionId": 12,
  "actionType": "UPDATED",
  "changedByUserRoleId": 31,
  "changedByName": "Team Leader",
  "oldRepositoryUrl": "https://github.com/seal/old-product",
  "newRepositoryUrl": "https://github.com/seal/team-product",
  "oldDemoUrl": null,
  "newDemoUrl": "https://demo.example.com",
  "oldSlideUrl": null,
  "newSlideUrl": "https://docs.google.com/presentation/d/example",
  "oldStatus": "Submitted",
  "newStatus": "Submitted",
  "createdAt": "2026-06-07T10:20:00"
}
```

## Common Errors

| HTTP | Error | When |
| --- | --- | --- |
| `400` | `Repository URL must be a valid GitHub or GitLab repository URL` | URL format is invalid or the host is not GitHub/GitLab |
| `400` | `Round does not belong to the team's event` | Client submits to a round from another event |
| `403` | `Only the team leader can manage submissions` | Non-leader tries to create/update |
| `403` | `You are not a member of this team` | Student tries to view another team's submission |
| `409` | `A submission requires a valid team with 3 to 5 members` | Team size is not valid |
| `409` | `Submissions are open only while the event is Ongoing` | Event is not in submission phase |
| `409` | `The submission deadline for this round has passed` | Round deadline already passed |
| `409` | `This team already has a submission for this round` | Duplicate team-round submission |
| `409` | `Team is not qualified for this round` | Team tries to submit to a later round without advancement |

## Database Migration

Run `database/seal_team_update_all_in_one.sql` on existing team databases before starting the updated backend. This script includes the account status/rejection reason fixes, business-rule constraints, and submission management tables in one import.
