# Contribution Guide Specification

This document details the configuration prerequisites, local environment setup instructions, and execution commands required to start contributing to ArchSim.

---

## 1. Prerequisites & Tooling
Before setting up the project locally, ensure you have installed:
* **Java Development Kit (JDK)**: Version 17 (e.g. Eclipse Temurin).
* **Node.js**: Version 18.x or 20.x (including `npm`).
* **Docker Desktop**: For running database containers.
* **Database Client**: DBeaver or PgAdmin (optional).

---

## 2. Environment Setup

### 2.1. Start Local Databases (Docker Compose)
From the project root folder:
```bash
docker-compose -f docker/docker-compose.local.yml up -d
```
This initializes local PostgreSQL, Redis, and InfluxDB instances.

### 2.2. Initialize Backend (Spring Boot)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Build the Maven project:
   ```bash
   ./mvnw clean install
   ```
3. Run the Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
   ```
The backend API server will start on `http://localhost:8080`.

### 2.3. Initialize Frontend Client (React)
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
The client browser window will open on `http://localhost:5173`.
