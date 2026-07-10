# ArchSim Database Schema Specification

This document details the PostgreSQL relational schema layout, indices, and foreign key constraints for the ArchSim platform.

---

## 1. Entity Relationship Model (DDL)

```sql
-- Projects Table
CREATE TABLE projects (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tenant_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1
);

-- Canvas States Table (Stores the visual graph JSON)
CREATE TABLE canvas_states (
    project_id VARCHAR(64) PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    nodes JSONB NOT NULL,
    links JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Simulation Runs Table
CREATE TABLE simulation_runs (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
    started_by VARCHAR(64) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(32) CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
    traffic_profile VARCHAR(64) NOT NULL,
    seed BIGINT NOT NULL
);

-- Users Table
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    display_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. Indices & Query Optimization

### 2.1. Canvas JSONB Indices
To quickly query projects by internal properties (e.g. searching for projects containing `POSTGRESQL` component types):
```sql
CREATE INDEX idx_canvas_nodes_gin ON canvas_states USING gin (nodes);
```

### 2.2. Simulation Run Queries
For loading historical runs for a project:
```sql
CREATE INDEX idx_sim_runs_project ON simulation_runs(project_id, started_at DESC);
```

---

## 3. Reference Database Migration Rules
* **Tool**: Flyway or Liquibase is used to handle database schemas updates.
* **Migration Files**: Stored in `src/main/resources/db/migration/`. File names must follow strict semantic version naming: `V1__initial_schema.sql`, `V2__add_index_to_simulation_runs.sql`, etc.
* **Rollback scripts**: Every migration must have a corresponding `.rollback` SQL script validated in the staging environment.
