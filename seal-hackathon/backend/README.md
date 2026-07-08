# SEAL Hackathon Backend

Spring Boot API for the SEAL Hackathon Management System.

## Stack

- Java 21
- Spring Boot 3.3.x
- Maven
- Spring Security + JWT
- Microsoft SQL Server / Azure SQL

## Database Profiles

1. `dev`
   - Target: local SQL Server `localhost:1433`
   - Database: `SEAL_Hackathon_G06`
   - Hibernate: `spring.jpa.hibernate.ddl-auto=none`
   - Expected workflow: rerun `database/seal_hackathon.sql` then `database/seed_test_data.sql` after pulling schema changes

2. `prod`
   - Target: Azure SQL
   - Hibernate: `spring.jpa.hibernate.ddl-auto=none`

## Local Run

Before starting the backend, prepare the local database with:

```text
database/seal_hackathon.sql
database/seed_test_data.sql
```

Then run:

```bash
./mvnw spring-boot:run
```

## Build

```bash
./mvnw clean package -DskipTests
```
