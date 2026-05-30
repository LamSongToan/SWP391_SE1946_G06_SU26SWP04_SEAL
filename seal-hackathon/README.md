# SEAL Hackathon Management System

This repository contains the source code, database scripts, and documentation for the SEAL Hackathon Management System project.

## Stack

- Backend: Java 21 + Spring Boot 3.3 + Spring Security + JWT + JPA
- Frontend: React 18 + Vite
- Database: SQL Server (script in `database/seal_hackathon.sql`)

## Sprint 1 (Auth Foundation)

Implemented modules:
- Authentication Register
- Authentication Login (username + password)
- JWT authentication setup
- Role-based authorization demo

API docs after backend starts:
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`

## Directory Structure

- **backend/**: Spring Boot application containing API services.
- **frontend/**: ReactJS application containing user interface.
- **database/**: SQL scripts and test SQL helpers.
- **docs/**: Project documentation.
  - **api-contracts/**: REST API contracts and specifications.
  - **meeting-notes/**: Internal team meeting notes.
  - **screenshots/**: Application and UI/UX mockups/screenshots.

## Quick Start

### 1) Database

1. Open SQL Server Management Studio.
2. Run `database/seal_hackathon.sql`.
3. Run `database/seed_test_data.sql` for sample users and event data.
4. Update backend DB credentials in:
   - `backend/src/main/resources/application.properties`

### 2) Backend

```powershell
cd seal-hackathon/backend
mvn test
mvn spring-boot:run
```

### 3) Frontend

```powershell
cd seal-hackathon/frontend
npm install
npm run dev
```

Open app:
- `http://localhost:5173`

## Auth Testing Notes

New account is `PENDING` by default and cannot login until approved.
Login flow for users is username + password (`/api/auth/login`).

For Sprint 1 testing before approval module is merged, run:
- `database/sprint1_auth_test_data.sql`

Then login in frontend or via Swagger/Postman.
