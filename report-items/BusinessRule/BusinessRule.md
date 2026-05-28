# SEAL Hackathon Management System  
# Business Rules & Acceptance Criteria

| Function | Business Rule | Acceptance Criteria |
|---|---|---|
| Login Function | Users can log in using either username or email address. | System accepts login using valid username or registered email. |
| Login Function | Password must match the encrypted password stored in the system. | User can log in successfully only when the correct password is entered. |
| Login Function | Only approved and active accounts can log in. | PendingApproval, Rejected, Suspended, or Inactive accounts cannot access the system. |
| Login Function | JWT token must be generated after successful authentication. | System returns a valid JWT token after successful login. |
| Register Function | Users can register as FPT students or external students. | Registration form supports both student types. |
| Register Function | FPT students must provide a valid FPT student ID. | System validates FPT student ID format before registration is accepted. |
| Register Function | External students must provide student ID and university name. | Registration cannot be completed without required external student information. |
| Register Function | Email address must be unique. | System rejects registration if the email already exists. |
| Register Function | Username must be unique. | System rejects duplicated usernames. |
| Register Function | Password must contain at least 8 characters, including uppercase, lowercase, number, and special character. | Weak passwords are rejected by the system. |
| Register Function | Newly registered accounts must have PendingApproval status. | New accounts cannot access event functions until approved by organizer. |
| Forgot Password Function | Users must provide registered email address. | Password reset request is accepted only for existing accounts. |
| Forgot Password Function | Users must verify OTP or reset token before changing password. | Reset password page is accessible only after successful verification. |
| Forgot Password Function | Reset token must expire after a configured time period. | Expired reset links or OTPs are rejected. |
| Change Password Function | Users must enter the correct current password before changing password. | Password is updated only when current password is valid. |
| Change Password Function | New password must satisfy password policy. | System rejects invalid or weak passwords. |
| Change Password Function | New password must be different from old password. | System prevents reusing the current password. |
| Create Team Function | Only approved participants can create teams. | Team creation is blocked for unapproved users. |
| Create Team Function | Each team must contain from 3 to 5 members. | System rejects teams with fewer than 3 or more than 5 members. |
| Create Team Function | A participant can belong to only one team per event. | System prevents users from joining multiple teams in the same event. |
| Create Team Function | Team name must be unique within the same event. | Duplicate team names in the same event are rejected. |
| Create Team Function | Each team must have exactly one Team Leader. | System assigns and maintains only one leader role per team. |
| Join Team Function | Users can join teams only through invitation or valid team code. | System validates invitation or join code before allowing access. |
| Join Team Function | Users cannot join teams that already reached maximum capacity. | Teams with 5 members cannot accept additional participants. |
| Join Team Function | Users cannot join another team after already joining one in the same event. | System blocks duplicate participation within the same event. |
| Invitation Function | Only Team Leaders can invite participants into teams. | Invitation action is available only for Team Leaders. |
| Invitation Function | Invitations can only be sent to registered accounts. | System rejects invitations to non-existing accounts. |
| Invitation Function | Duplicate pending invitations are not allowed. | System prevents multiple active invitations to the same user. |
| Register Event Function | Only approved users can register for events. | Unapproved users cannot register for any event. |
| Register Event Function | Registration is allowed only during the event registration period. | Registration outside configured dates is rejected. |
| Register Event Function | A team can register only once per event. | Duplicate event registrations are prevented. |
| Register Track Function | Teams must register into exactly one category/track unless event configuration allows multiple categories. | System validates category registration rules. |
| Register Track Function | Selected category must belong to the target event. | Invalid category selection is rejected. |
| Register Track Function | Teams can only register categories while registration is open. | Category registration closes automatically after deadline. |
| Submit Function | Only registered teams can submit project materials. | Submission is blocked for unregistered teams. |
| Submit Function | Submission must be made before round deadline. | Late submissions are automatically rejected or marked late based on configuration. |
| Submit Function | Submission must include repository URL, demo URL, and report/slide URL if required by the round. | Incomplete submissions are rejected. |
| Submit Function | Repository URL must be a valid GitHub or GitLab repository link. | Invalid repository URLs are rejected. |
| Submit Function | Teams can edit submissions only before submission deadline. | Submission editing is disabled after deadline. |
| Submit Function | System may retrieve repository metadata through GitHub/GitLab API. | Repository information is automatically displayed when integration is enabled. |
| Manage Event Function | Only Organizers can create, update, publish, or close events. | Event management actions are restricted to organizer role. |
| Manage Event Function | Each event can contain multiple rounds. | Organizer can configure Preliminary, Semi-final, Final, or custom rounds. |
| Manage Event Function | Event start date must be earlier than end date. | Invalid event timeline configurations are rejected. |
| Manage Round Function | Each round must belong to a valid event. | System prevents orphan rounds. |
| Manage Round Function | Each round must have submission deadline, assigned judges, and scoring criteria. | Round cannot be activated without required configurations. |
| Manage Round Function | Round progression rules must define how teams advance to the next round. | Organizer can configure Top N teams per category for qualification. |
| Manage Round Function | Teams eliminated in previous rounds cannot submit in later rounds. | Only qualified teams can access next-round submission. |
| Manage Category Function | Categories must belong to an existing event. | Invalid category creation is rejected. |
| Manage Category Function | Category names must be unique within the same event. | Duplicate category names are not allowed. |
| Manage Category Function | A mentor can mentor one category and judge another category within the same event. | System allows non-conflicting mentor/judge assignments. |
| Manage Criteria Function | Organizers can maintain reusable default scoring templates. | Default templates can be reused across events. |
| Manage Criteria Function | Event criteria can inherit and customize default templates. | Organizer can add, remove, or modify criteria and weights. |
| Manage Criteria Function | Total criteria weight must equal 100%. | Invalid rubric configurations are rejected. |
| Approve User Function | All participant accounts require organizer approval before participation. | Pending users cannot join events or teams before approval. |
| Approve User Function | Guest judges must be created by organizers as temporary accounts. | Guest judge accounts cannot self-register. |
| Approve User Function | Guest judges can access only assigned rounds and submissions. | Unauthorized access is blocked. |
| Assign Judge Function | Organizers can assign internal or guest judges to rounds. | Judges can view only assigned rounds. |
| Assign Judge Function | A judge cannot score submissions outside assigned rounds. | Unauthorized scoring attempts are blocked. |
| Score Submission Function | Judges must score based on event-specific criteria. | Score form displays correct rubric for the event and round. |
| Score Submission Function | Each judge’s score for each criterion must be stored separately. | System records individual criterion scores per judge independently. |
| Score Submission Function | Judges cannot modify submitted scores after round closure unless organizer reopens scoring. | Score editing is locked after scoring deadline. |
| Feedback Function | Judges and mentors can provide textual feedback for teams. | Teams can view feedback linked to their submissions. |
| Feedback Function | Feedback history must be stored for audit purposes. | Previous feedback entries remain accessible in logs. |
| Ranking Awards Function | System must automatically rank teams by round, category, and overall event score. | Rankings are generated automatically after scoring completion. |
| Ranking Awards Function | Round qualification must follow configured advancement rules. | Only eligible teams are promoted to next round. |
| Ranking Awards Function | Organizers can disqualify teams or submissions violating competition rules. | Disqualified teams are removed from rankings and marked with reason. |
| Ranking Awards Function | Disqualification reason must be recorded in audit logs. | Audit trail stores organizer action and justification. |
| View Research Dashboard Function | System must display score variance between judges per criterion. | Dashboard visualizes scoring consistency across judges. |
| View Research Dashboard Function | Calibration rounds can be conducted using sample submissions. | Judges can score sample submissions before official evaluation. |
| View Research Dashboard Function | System must display score distribution during calibration. | Dashboard shows score spread and statistical comparison. |
| Export Research Dataset Function | System must export anonymized scoring datasets in CSV format. | Exported CSV does not contain personally identifiable information. |
| Export Research Dataset Function | Exported dataset must preserve criterion-level scores from each judge. | CSV includes independent judge scores for analysis. |
| Create Report Function | Organizers can generate ranking and scoring reports. | Reports include event, category, round, score, and ranking data. |
| Create Report Function | Reports can be exported as CSV or Excel files. | Exported files are downloadable successfully. |
| Send Announcement Function | Organizers can publish announcements to all participants. | Announcements are visible in participant dashboards. |
| Send Notification Function | System must notify users about invitations, approvals, deadlines, scoring, and announcements. | Notifications are delivered correctly to target users. |
| Audit Log Function | All scoring, approval, disqualification, and management actions must be logged. | Audit logs store user, action, timestamp, and related entity. |
