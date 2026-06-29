# Announcement and Notification API

## Business Rules

- Coordinators can publish announcements to active students, mentors, judges, or all participants.
- Recipient preview lets coordinators confirm the target audience before sending.
- Notifications appear on each target user's dashboard.
- Users can mark notifications as read individually or in bulk.

## Endpoints

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/coordinator/announcements` | Coordinator | List sent announcements |
| `GET` | `/api/coordinator/announcements/recipient-preview?eventId={eventId}&audience={audience}` | Coordinator | Preview target recipient count |
| `POST` | `/api/coordinator/announcements` | Coordinator | Send an announcement |
| `PUT` | `/api/coordinator/announcements/{announcementId}` | Coordinator | Update announcement title/message |
| `DELETE` | `/api/coordinator/announcements/{announcementId}` | Coordinator | Delete announcement and related notifications |
| `GET` | `/api/dashboard/event-updates` | Authenticated user | List dashboard notifications |
| `PATCH` | `/api/dashboard/event-updates/{notificationId}/read` | Authenticated user | Mark one notification as read |
| `PATCH` | `/api/dashboard/event-updates/read-all` | Authenticated user | Mark recent dashboard notifications as read |

## Send Announcement Request

```json
{
  "eventId": 1,
  "audience": "STUDENTS",
  "title": "Submission deadline reminder",
  "message": "Please submit before 23:59 tonight."
}
```

Allowed audiences: `ALL`, `STUDENTS`, `MENTORS`, `JUDGES`.
