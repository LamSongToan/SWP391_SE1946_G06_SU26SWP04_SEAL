# SEAL Hackathon Management System  
# Business Rules & Acceptance Criteria

## 1. Authentication
| ID | Business Rule | Acceptance Criteria |
|---|---|---|
| **BR1-01** | Only email/password and Google authentication are supported. | Users can authenticate using either email/password or Google. |
| **BR1-02** | Only active accounts can log in. | Inactive accounts cannot access the system. |
| **BR1-03** | Passwords must meet the password policy. | Passwords that violate the policy are rejected. |
| **BR1-04** | Email addresses must be verified before registration. | Registration is completed only after successful OTP verification. |

## 2. Account Management
| ID | Business Rule | Acceptance Criteria |
|---|---|---|
| **BR2-01** | Only Coordinators can approve accounts. | Only Coordinators can approve or reject pending accounts. |
| **BR2-02** | Password reset requires OTP verification. | Password reset is allowed only after OTP verification. |
| **BR2-03** | OTP must be valid. | Expired or invalid OTPs are rejected. |
| **BR2-04** | Current passwords must be verified before changes. | Password updates fail if the current password is incorrect. |
| **BR2-05** | New passwords must differ from current passwords. | Reusing the current password is not allowed. |

## 3. Event Management
| ID | Business Rule | Acceptance Criteria |
|---|---|---|
| **BR3-01** | Only Coordinators can manage events. | Only Coordinators can create, update, or delete events. |
| **BR3-02** | Only one event is allowed per season each year. | Duplicate events for the same season and year are rejected. |
| **BR3-03** | An event must contain at least one track and one round. | Events cannot be published without a track and a round. |
| **BR3-04** | Event schedules must be valid. | Invalid event dates or round deadlines are rejected. |
| **BR3-05** | Criteria weights must total 100%. | Criteria cannot be saved unless the total weight equals 100%. |

## 4. Team Management
| ID | Business Rule | Acceptance Criteria |
|---|---|---|
| **BR4-01** | Teams must contain 3–5 members. | Teams outside this range cannot participate. |
| **BR4-02** | Only students can join teams. | Non-student users cannot join a team. |
| **BR4-03** | Team leadership transfer requires recipient acceptance. | Leadership changes only after the recipient accepts the request. |
| **BR4-04** | Team leaders cannot leave before transferring leadership. | Team leaders cannot leave unless leadership has been transferred. |

## 5. Submission Management
| ID | Business Rule | Acceptance Criteria |
|---|---|---|
| **BR5-01** | Only registered teams can submit projects. | Unregistered teams cannot submit projects. |
| **BR5-02** | Submissions must be made before the deadline. | Late submissions are rejected. |
| **BR5-03** | Required submission information must be provided. | Incomplete submissions cannot be submitted. |
| **BR5-04** | Submissions can be updated before the deadline only. | Submission editing is disabled after the deadline. |

## 6. Judge Management
| ID | Business Rule | Acceptance Criteria |
|---|---|---|
| **BR6-01** | Only Coordinators can assign judges. | Only Coordinators can assign judges to rounds. |
| **BR6-02** | Judges evaluate assigned submissions only. | Judges cannot access unassigned submissions. |
| **BR6-03** | Guest judges cannot self-register. | Guest judge accounts are created by Coordinators only. |
| **BR6-04** | A lecturer can hold both Mentor and Judge roles if assigned to different tracks. | Dual-role assignments are allowed only across different tracks. |

## 7. Evaluation
| ID | Business Rule | Acceptance Criteria |
|---|---|---|
| **BR7-01** | Evaluations follow predefined criteria. | Judges evaluate submissions using the assigned scoring rubric. |
| **BR7-02** | Each judge submits an independent evaluation. | Each judge's evaluation is recorded independently. |
| **BR7-03** | Scores are locked after round closure. | Closed-round scores cannot be modified. |
| **BR7-04** | Judges and mentors can provide feedback. | Teams can view submitted feedback. |
| **BR7-05** | Feedback history is preserved. | Previous feedback remains accessible. |

## 8. Ranking & Awards
| ID | Business Rule | Acceptance Criteria |
|---|---|---|
| **BR8-01** | Rankings are based on evaluation results. | Rankings are generated from final evaluation scores. |
| **BR8-02** | Leaderboards are available after publication only. | Users can view the leaderboard only after publication. |
| **BR8-03** | Team promotion follows competition rules. | Only qualified teams advance to the next round. |
| **BR8-04** | Awards are granted based on final rankings. | Awards are assigned according to the published rankings. |
| **BR8-05** | Only Coordinators can disqualify teams. | Only Coordinators can disqualify teams or submissions. |
| **BR8-06** | Disqualified teams are not eligible for awards. | Disqualified teams are excluded from rankings and awards. |

## 9. Report & Audit
| ID | Business Rule | Acceptance Criteria |
|---|---|---|
| **BR9-01** | Only Coordinators can generate reports. | Reports are available only to Coordinators. |
| **BR9-02** | Reports include ranking and scoring data. | Generated reports contain ranking and evaluation results. |
| **BR9-03** | Important system activities must be logged. | Audit logs record significant user actions. |

## 10. Communication
| ID | Business Rule | Acceptance Criteria |
|---|---|---|
| **BR10-01** | Only Coordinators can publish announcements. | Published announcements are visible to participants. |
| **BR10-02** | Notify users of important activities. | Notifications are sent for relevant system events. |
