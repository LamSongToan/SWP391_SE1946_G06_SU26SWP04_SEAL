# Auth API Contract (Sprint 1)

Base URL: `http://localhost:8080`

## 1) Register

Endpoint: `POST /api/auth/register`

### Request body

```json
{
  "username": "an.student",
  "email": "an.student.demo@gmail.com",
  "password": "12345678",
  "fullName": "Nguyen Van An",
  "studentType": "FPT",
  "fptStudentCode": "SE181234",
  "externalStudentCode": null,
  "externalUniversity": null
}
```

For external student:

```json
{
  "username": "ext.student",
  "email": "ext.student.demo@gmail.com",
  "password": "12345678",
  "fullName": "External User",
  "studentType": "EXTERNAL",
  "fptStudentCode": null,
  "externalStudentCode": "EXT001",
  "externalUniversity": "ABC University"
}
```

### Success response

```json
{
  "success": true,
  "message": "Register completed",
  "data": {
    "userId": 1,
    "username": "an.student",
    "email": "an.student.demo@gmail.com",
    "status": "PendingApproval",
    "message": "Registered successfully. Account is pending coordinator approval."
  }
}
```

## 2) Login

Endpoint: `POST /api/auth/login`

### Request body

```json
{
  "username": "an.student",
  "password": "12345678"
}
```

### Success response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresInSeconds": 3600,
    "email": "an.student.demo@gmail.com",
    "username": "an.student",
    "fullName": "Nguyen Van An",
    "status": "Active",
    "roles": [
      "STUDENT"
    ]
  }
}
```

## 3) Protected Endpoints (JWT + RBAC)

### Me
- `GET /api/demo/me`
- Authenticated user only

### Student role
- `GET /api/demo/student`
- Requires role: `ROLE_STUDENT`

### Coordinator role
- `GET /api/demo/coordinator`
- Requires role: `ROLE_COORDINATOR`

## Common errors

- `400` validation failed
- `401` invalid username or password
- `403` account pending approval or no permission
- `409` email/username already exists
