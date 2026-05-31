# Team Management API

All endpoints require a JWT for an approved student account.

## Business Rules

- A team belongs to exactly one category (`Track`) in an event.
- A student may belong to at most one team in the same event.
- A team leader is automatically added as the first team member.
- A valid team contains 3-5 members.
- Team creation, invitation, joining, leadership transfer and member removal are available only while the event is `RegistrationOpen`.
- Only the team leader may invite or remove members.
- Only the current team leader may transfer leadership to another existing team member.
- A leader may disband a team only before its first submission.
- A regular member may leave a team; a leader must transfer leadership before leaving.
- Pending invitations reserve available slots and may be cancelled by the leader.
- Database guards reject a sixth member, duplicate membership in one event and submissions from teams outside the 3-5 member range.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/teams/my` | List teams of the signed-in student |
| `GET` | `/api/teams/{teamId}` | Get team details and member readiness |
| `GET` | `/api/teams/events/{eventId}/tracks` | List categories available for registration |
| `POST` | `/api/teams` | Create a team with `trackId` and `teamName` |
| `POST` | `/api/teams/{teamId}/invitations` | Invite a student with `identifier` (username or email) |
| `GET` | `/api/teams/{teamId}/invitations` | List invitations sent by a team |
| `POST` | `/api/teams/{teamId}/invitations/{invitationId}/cancel` | Cancel a pending invitation |
| `POST` | `/api/teams/join` | Join a team with `joinCode` |
| `DELETE` | `/api/teams/{teamId}/members/{userRoleId}` | Remove a member |
| `PATCH` | `/api/teams/{teamId}/leader/{userRoleId}` | Transfer leadership to an existing member |
| `DELETE` | `/api/teams/{teamId}/members/me` | Leave a team as a regular member |
| `DELETE` | `/api/teams/{teamId}` | Disband an unused team as its leader |
| `GET` | `/api/team-invitations/my` | List invitations for the signed-in student |
| `POST` | `/api/team-invitations/{invitationId}/accept` | Accept an invitation |
| `POST` | `/api/team-invitations/{invitationId}/reject` | Reject an invitation |

## Database Migration

For an existing database, run `database/team_management_migration.sql` before starting the updated backend.
