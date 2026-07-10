# ArchSim Scaling Strategy Specification

This document details the scaling strategies for the high-frequency metrics aggregation, WebSocket connections, and CPU-intensive simulation tasks within ArchSim.

---

## 1. Scaling the WebSocket Connection Layer
Since simulations stream metric updates in real-time, handling thousands of concurrent users requires scaling the WebSocket tier:

```
[Users Connected] ──► [Application Load Balancer (Sticky Sessions)]
                             │
            +────────────────┼────────────────+
            ▼                ▼                ▼
     [WS Server 1]     [WS Server 2]     [WS Server 3]
            ▲                ▲                ▲
            └─────────┬──────┴────────────────┘
                      ▼
               [Redis Pub/Sub]
```

* **ALB Configuration**: Enabled with sticky sessions to bind client connections to individual WebSocket containers for the duration of a simulation session.
* **Redis Pub/Sub Backbone**: Acts as the message broker between WebSocket instances. If User A makes a change on Server 1, the change details are published to Redis, and Server 2 and 3 consume the message to update their active client channels.
* **Connection Offloading**: The application uses non-blocking asynchronous APIs (Spring WebFlux/Netty) to allow a single backend server container to support up to 50,000 idle TCP connections.

---

## 2. High-Frequency Telemetry Ingestion
A running simulation generates millions of metric points per minute. Ingestion bottlenecks are resolved using:
* **Batch Ingestion**: Telemetry agents pool metrics and write updates to TimescaleDB in batches of 5,000 rows rather than firing transactional single-row inserts.
* **Time-Series Compression**: TimescaleDB uses compression policies to group historical simulation metrics older than 2 hours, reducing storage costs by up to $90\%$.
* **Retention Policy**: Active simulation details are stored for 14 days, after which data is purged unless flagged as "Saved Simulation Replay."

---

## 3. Simulation Worker Pool Isolation
Heavy simulation runs (e.g., executing a DDoS traffic model against a 500-node canvas) are CPU-bound.
* **Worker Pools**: Simulation runs are delegated to isolated, dedicated thread pools (`java.util.concurrent.ThreadPoolExecutor`) to ensure that intense calculations do not block backend API endpoints or WebSocket metric transfers.
* **Horizontal Scaling**: If the simulation thread pools reach $80\%$ CPU utilization, Kubernetes triggers an HPA (Horizontal Pod Autoscaler) event to provision more simulation runner instances.
