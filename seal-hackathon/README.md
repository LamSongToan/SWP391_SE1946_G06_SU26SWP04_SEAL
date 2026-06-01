# SEAL Hackathon Management System

This repository contains the source code, database scripts, and documentation for the SEAL Hackathon Management System project.

## Stack

- **Backend**: Java 21 + Spring Boot 3.3 + Spring Security + JWT + JPA + Docker
- **Frontend**: React 18 + Vite
- **Database**: SQL Server (Local) / Azure SQL Database (Online Serverless)

---

## 🌐 Hybrid Environments Architecture

To optimize teamwork and protect Azure cloud credits, the project runs on a split-environment workflow:

### 1) Development Environment (Local)
- **App**: Hosted locally on your machine (`localhost:5173` & `localhost:8080`).
- **Database**: Runs on your local SQL Server instance using `sa` credentials.
- **Workflow**: Fast hot-reloads, zero cloud credit drain, safe for experiments.

### 2) Production Environment (Online / Exam Deployment)
- **Frontend**: Deployed on **Render Static Site** (Always active, no cold starts).
- **Backend**: Deployed on **Render Web Service** via a Multi-stage **Dockerfile** (Auto-pauses after 15m idle).
- **Database**: Hosted online on **Azure SQL Database** (Serverless tier with auto-pause to save student credits).

---

## Directory Structure

- **backend/**: Spring Boot application containing API services and Dockerfile configuration.
- **frontend/**: ReactJS application containing user interface and environment endpoints.
- **database/**: SQL scripts and test SQL helpers (Cleaned of database creation/switching limits for Azure compatibility).
- **docs/**: Project documentation.

---

## Quick Start (Local Development)

### 1) Database Setup
1. Open SQL Server Management Studio (SSMS) on your computer.
2. Manually create a local database named `SEAL_Hackathon_G06`.
3. Select the created database and execute `database/seal_hackathon.sql`.
4. Execute `database/seed_test_data.sql` and `database/sprint1_auth_test_data.sql` for sample data.

### 2) Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Open `src/main/resources/application.properties` and verify that the local development profile is active:
   ```properties
   spring.profiles.active=dev
   ```
3. Boot up the local server:
   ```bash
   ./mvnw spring-boot:run
   ```
   *Note: In `dev` profile, Hibernate is set to `ddl-auto=update` to automatically synchronize entity modifications.*

### 3) Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies and start the Vite local server:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser. Vite will automatically load environment endpoints from `.env.development` targeting `http://localhost:8080`.

---

## 🚀 Cloud Deployment Settings (Render & Azure)

When pushing changes to the `main` or `master` branch, **Render** automatically fetches the code and redeploys the live ecosystem.

### 1) Online Backend Configuration (Render Web Service)
- **Language/Runtime**: `Docker` (Render automatically builds the internal multi-stage `Dockerfile` targeting JDK 21).
- **Root Directory**: `backend`
- **Environment Variables Required on Render Dashboard**:
  - `DB_HOST`: Your Azure SQL server address (e.g., `your-server.database.windows.net:1433`)
  - `DB_NAME`: `SEAL_Hackathon_G06`
  - `DB_USER`: Azure Database Admin Username
  - `DB_PASSWORD`: Azure Database Admin Password
- **Live API Endpoint**: `https://onrender.com`
- **Live Swagger UI**: `https://onrender.com/swagger-ui/index.html`

### 2) Online Frontend Configuration (Render Static Site)
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Redirects/Rewrites Rule (Required for SPA React Router stability)**:
  - *Source*: `/*` | *Destination*: `/index.html` | *Action*: `Rewrite`

### 3) Online Database Configuration (Azure SQL Firewall Rules)
To grant Render backend processing access to the database, navigate to **Networking** on Azure Portal:
1. Enable exception: Check `Allow Azure services and resources to access this server`.
2. Add a global firewall bypass rule: Set `Start IP: 0.0.0.0` and `End IP: 255.255.255.255`.

---

## 🧪 Postman & Auth Testing Notes

- New accounts are initialized with a `PENDING` state status and cannot access core elements until authorized.
- To execute API testing before frontend interfaces are fully wired, utilize **Postman**:
  1. Set request method to **POST** targeting `https://onrender.com/api/auth/login`.
  2. Provide raw JSON credentials payload matching database records.
  3. Extract the returned **JWT Token** response.
  4. For secured routes, include the code in the **Authorization** header as a **Bearer Token**.

💡 **Exam Day Recommendation**: Render free web services slip into sleep mode after 15 minutes of dynamic inactivity. To avoid a 50-second "cold start" delay during grading sessions, a team member should access the live frontend link 5-10 minutes prior to the examination to wake up both Render nodes and Azure database instances.
