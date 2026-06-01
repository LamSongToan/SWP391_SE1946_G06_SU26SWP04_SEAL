# ☕ SEAL Hackathon - Backend Documentation

This directory contains the Spring Boot Core API application for the SEAL Hackathon Management System.

## Technical Specifications
- **Java Version**: JDK 21
- **Framework**: Spring Boot 3.3.x
- **Build Tool**: Maven
- **Security**: Spring Security + JWT (JSON Web Tokens)
- **Database Engine**: Microsoft SQL Server / Azure SQL

---

## 🛠️ Database Profiles Management

The backend utilizes **Spring Profiles** to switch database drivers securely without modifications to the source code:

1. **`dev` Profile (Local SQL Server)**:
   - Target: `localhost:1433` (Database: `SEAL_Hackathon_G06`)
   - Strategy: `spring.jpa.hibernate.ddl-auto=update`
   - Active by default via `application.properties`.

2. **`prod` Profile (Azure Cloud SQL)**:
   - Target: Azure Dynamic Host Environment Variables.
   - Strategy: `spring.jpa.hibernate.ddl-auto=none` (Production safety lock).
   - Enforced automatically inside the cloud runtime via Docker execution arguments.

---

## 🐋 Docker Optimization

A multi-stage `Dockerfile` is integrated at the root of this folder to guarantee identical execution environments during local tests and Render production deploys:

- **Stage 1 (Build)**: Compiles the codebase utilizing `maven:3.9.6-eclipse-temurin-21`.
- **Stage 2 (Runtime)**: Runs the generated fat JAR using a lightweight, secure `eclipse-temurin:21-jre-alpine` image to shrink memory foot-print below Render's 512MB threshold.

---

## 🛡️ Security & API Endpoint Architecture

### 1) Authentication Matching Rules
Configure your route rules inside `com.seal.hackathon.config.SecurityConfig`. Currently bypassed endpoints:
- Anonymous access: `/api/auth/**` and `/api/public/**`
- Documentation bypass: `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`

### 2) Postman Connection Setup
- Headers for regular requests: `Content-Type: application/json`
- Headers for authenticated/protected requests: `Authorization: Bearer <YOUR_JWT_TOKEN>`

---

## 💻 Local CLI Operations

To manually control or build the backend component, invoke the following scripts from this directory:

### Run Server Locally
```bash
./mvnw spring-boot:run
```

### Build & Package Fat JAR
```bash
./mvnw clean package -DskipTests
```
