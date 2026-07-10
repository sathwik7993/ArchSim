# ArchSim Service Boundaries Specification

This document details the boundaries, roles, and communication contracts for each micro-service or module within the ArchSim platform.

---

## 1. Service Map & Interfaces

ArchSim is organized into specialized service modules. During local development, these services run within a single monolithic container, but they are architected to scale as independent microservices in cloud environments.

```
+---------------------------------------------------------------------------------+
|                                  API Gateway                                    |
+---------------------------------------------------------------------------------+
         |                                  |                              |
+----------------+                  +---------------+              +--------------+
|  User Service  |                  | Project Svc   |              | Simulation   |
|  - Auth/JWT    |                  | - Canvas CRUD |              |  Core Svc    |
|  - User Profile|                  | - Templates   |              |  - Event DES |
+----------------+                  +---------------+              |  - Engine Run|
                                                                   +--------------+
                                                                           |
                                                                   +--------------+
                                                                   | Telemetry Svc|
                                                                   | - Metrics    |
                                                                   | - Logs       |
                                                                   +--------------+
```

---

## 2. Service Definitions

### 2.1. User & Identity Service (`UserService`)
* **Role**: Manages user profiles, credentials, access control lists (ACLs), and session tokens.
* **Database**: PostgreSQL (Tables: `users`, `sessions`, `roles`).
* **Protocols**: REST API over HTTPS. JWT authentication tokens are returned on login.

### 2.2. Project & Design Service (`ProjectService`)
* **Role**: Manages architectural designs, layouts, canvas coordinates, templates, and interview challenges.
* **Database**: PostgreSQL (Tables: `projects`, `canvas_states`, `components`, `connections`).
* **Protocols**: REST API. Saves are sent as JSON payloads describing nodes, links, and configuration properties.

### 2.3. Simulation Core Service (`SimulationService`)
* **Role**: Hosts the Discrete Event Simulator scheduler. Receives architecture graphs, initializes runtime objects, schedules events, and runs simulations.
* **Database**: Transient memory + state persistence in PostgreSQL for history snapshots.
* **Protocols**: WebSocket for real-time control (Play, Pause, Step) and state synchronization.

### 2.4. Telemetry & Analytics Service (`TelemetryService`)
* **Role**: Collects, pools, aggregates, and flushes simulated telemetry (CPU, Memory, connection queues) and structured execution logs.
* **Database**: TimescaleDB or InfluxDB (Tables: `metrics_raw`, `metrics_hourly`, `execution_logs`).
* **Protocols**: Ingests metrics via high-throughput internal memory channels (or Redis Pub/Sub) and exposes them to clients via WebSockets and REST endpoints.
