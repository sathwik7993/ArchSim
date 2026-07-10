# ArchSim Metrics Storage Specification

This document details the database schema, rollup configurations, and query layouts for high-frequency telemetry metrics collected during simulations.

---

## 1. Metrics Schema Design
Metrics are logged as continuous time-series data. In production environments, these metrics are stored in TimescaleDB.

### 1.1. Telemetry Table DDL
```sql
CREATE TABLE component_telemetry (
    simulation_run_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    component_id VARCHAR(64) NOT NULL,
    cpu_usage_pct REAL,
    memory_usage_mb REAL,
    active_connections INT,
    qps INT,
    error_rate REAL,
    p99_latency_ms REAL
);

-- Convert to Hypertable
SELECT create_hypertable('component_telemetry', 'timestamp', chunk_time_interval => INTERVAL '1 hour');
```

---

## 2. Invalidation & Rollup Aggregations
To prevent storage bloat and ensure fast query rendering on dashboard charts, we use continuous aggregations:

```sql
-- 1-Minute Metrics Rollup Table
CREATE MATERIALIZED VIEW component_metrics_1m
WITH (timescaledb.continuous) AS
SELECT 
    simulation_run_id,
    time_bucket('1 minute', timestamp) AS bucket,
    component_id,
    AVG(cpu_usage_pct) AS avg_cpu,
    MAX(cpu_usage_pct) AS max_cpu,
    AVG(p99_latency_ms) AS avg_p99_latency,
    SUM(qps) AS total_requests
FROM component_telemetry
GROUP BY simulation_run_id, bucket, component_id;
```

---

## 3. Retention Policies
* Raw `component_telemetry` rows are dropped after **3 days**.
* The 1-minute rollup table (`component_metrics_1m`) is retained for **14 days**.
* Aggregate reports (e.g. project averages) are persisted in PostgreSQL indefinitely.
