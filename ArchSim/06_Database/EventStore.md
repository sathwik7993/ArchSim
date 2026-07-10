# ArchSim Event Store Specification

This document details the schema and indexing strategy for persisting Discrete Event logs to support simulation playback and offline timeline scrubbing.

---

## 1. Event Log Storage Strategy
Every state change, packet delivery, and chaos injection event is recorded during a simulation run. To capture millions of events per run without degrading performance, we use a structured event table model in PostgreSQL/TimescaleDB.

### 1.1. Event Log Schema
```sql
CREATE TABLE simulation_events (
    simulation_run_id VARCHAR(64) NOT NULL,
    virtual_time_ms BIGINT NOT NULL,
    event_id VARCHAR(64) NOT NULL,
    component_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL, -- 'CPU_SPIKE', 'PACKET_DROP', 'FAILOVER'
    payload JSONB NOT NULL, -- Specific details of the event
    PRIMARY KEY (simulation_run_id, virtual_time_ms, event_id)
);
```

---

## 2. Ingestion & Query Optimization

### 2.1. Hypertable Partitioning
If using TimescaleDB, the `simulation_events` table is converted into a hypertable, partitioned by `virtual_time_ms` to speed up historical range queries:
```sql
SELECT create_hypertable('simulation_events', 'virtual_time_ms', chunk_time_interval => 60000);
```

### 2.2. Indexing Strategy
To fetch events for a specific component during timeline scrubs:
```sql
CREATE INDEX idx_sim_events_lookup 
ON simulation_events(simulation_run_id, component_id, virtual_time_ms ASC);
```

---

## 3. Storage Retention & Compaction
* **Run Termination**: When a simulation completes, the server writes a metadata row summarizing the run and schedules a background job to compress the event records.
* **Pruning Policy**: Unsaved simulation event logs are automatically pruned after 48 hours to conserve database disk space. Saved logs are compressed and archived to cold object storage (S3).
