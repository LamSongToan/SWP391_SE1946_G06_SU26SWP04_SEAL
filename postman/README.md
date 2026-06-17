# Postman Setup

## Files

- `SEAL-Hackathon.postman_collection.json`
- `SEAL-Local.postman_environment.json`

## Import

1. Open Postman
2. Click `Import`
3. Import both JSON files from this folder
4. Select environment `SEAL Local`

## Backend

Start backend before testing:

```powershell
cd C:\Users\nem\Desktop\my-project\SWP391_SE1946_G06_SU26SWP04_SEAL\seal-hackathon\backend
mvn spring-boot:run
```

Default base URL:

```text
http://localhost:8080
```

## Seed Accounts

- Student: `an.seal.demo@gmail.com / Seal@2026`
- Student: `linh.seal.demo@gmail.com / Seal@2026`
- Student: `bao.seal.demo@gmail.com / Seal@2026`
- Student: `quynh.seal.demo@gmail.com / Seal@2026`
- Student: `phuc.seal.demo@gmail.com / Seal@2026`
- Student: `nhat.seal.demo@gmail.com / Seal@2026`
- Student: `thao.seal.demo@gmail.com / Seal@2026`
- Student: `lam.seal.demo@gmail.com / Seal@2026`
- Coordinator: `toan.seal.demo@gmail.com / Seal@2026`
- Coordinator: `anh.seal.demo@gmail.com / Seal@2026`
- Mentor: `kiet.seal.demo@gmail.com / Seal@2026`
- Mentor: `vy.seal.demo@gmail.com / Seal@2026`
- Mentor: `duc.seal.demo@gmail.com / Seal@2026`
- Judge: `ngon.seal.demo@gmail.com / Seal@2026`
- Judge: `hao.seal.demo@gmail.com / Seal@2026`
- Judge: `trinh.seal.demo@gmail.com / Seal@2026`

## Recommended Demo Flow

1. `01 Public -> Get Upcoming Events`
2. `02 Auth -> Login Student`
3. `03 Profile -> Get My Profile`
4. `09 Authz Demo -> Demo Student`
5. `02 Auth -> Login Coordinator`
6. `04 Coordinator - User Approval -> Get Pending Users`
7. `05 Coordinator - Event Configuration -> Create Event With Setup`
8. `06 Team Management -> Get Registration Tracks By Event`
9. `06 Team Management -> Create Team`
10. `06 Team Management -> Invite Student By Username`

## Notes

- `Login Student` and `Login Coordinator` automatically save `accessToken`
- Some requests also auto-save:
  - `eventId`
  - `trackId`
  - `teamId`
  - `invitationId`
- `Forgot Password` requires SMTP to be configured if you want real OTP email delivery
- `Upload Avatar` is not included in the collection because Postman file upload is easier to create manually with `form-data`
