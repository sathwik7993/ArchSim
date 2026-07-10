# ArchSim Data Flow Specification

This document details the real-time data flow pipelines for simulation execution, metrics aggregation, and collaborative editing.

---

## 1. Simulation Request Lifecycle (Data Flow)

When a simulated client generates a request, data flows through the system engine as follows:

```
[Traffic Gen]
     │ (Create Request Event)
     ▼
[DNS Node] ──(Resolve Latency)──► [Connection Link] ──(TCP Handshake RTT)
                                                                 │
                                                                 ▼
[API Gateway] ◄──(Rate Limit & Queue Latency)── [Load Balancer]
     │
     ├─► [Cache (Redis)] ──(Hit: Return Data)
     │
     └─► [Compute VM] ──(CPU/Memory Cost)──► [Database] ──(IOPS & Lock Delay)
```

1. **Instantiation**: The Traffic Generator publishes a `REQUEST_INIT` event to the Discrete Event Queue.
2. **Network Phase**: The event is passed to the Network Engine, calculating transport delay (RTT, Bandwidth limit bottlenecks) and queuing delays on intermediate load balancers.
3. **Execution Phase**: The Compute component (e.g., API Gateway, Web VM) queues the event. When thread/connection slots open, the request consumes CPU cycles and RAM.
4. **Backend/Storage Phase**: Computations require caching lookups (Redis hit/miss calculation) or transactional database operations (SQL parsing delay, index search delay, lock queuing delays).
5. **Return**: The response payload travels back over the Network Engine links, accumulating return bandwidth transit delays, before resolving back at the client statistics node.

---

## 2. Telemetry & Metrics Aggregation Pipeline

To prevent simulation processing stalls, telemetry collection is asynchronously decoupled from simulation execution.

```
[Simulation Thread] ──(Atomic Counter Updates)──► [Internal Ring Buffer]
                                                           │
                                                           ▼
[Metrics Aggregator] ◄──(Poll / Drain every 100ms)─────────┘
        │
        ├─► [Redis Pub/Sub] ──► [WebSocket Connections] ──► [Browser Chart]
        │
        └─► [TimescaleDB Batch Writer] (Flush every 5s)
```

1. **Atomic Ingest**: The simulation engine updates atomic variables representing CPU, RAM, connection pool depths, and latencies inside components during virtual ticks.
2. **Ring Buffer**: Metric events are written to a ring buffer queue to decouple threads.
3. **Flush & Broadcast**: A metrics worker drains the buffer every 100ms:
  * Publishes aggregated data to Redis Pub/Sub, broadcasting real-time metrics over WebSockets to browsers.
  * Batches metrics for asynchronous write insertion into the time-series database.

---

## 3. Collaboration & Synchronization Flow (Yjs)

Collaborative modifications to the design canvas flow through a synchronization pipeline to guarantee consistency.

1. **Visual Changes**: A user moves a node or updates a config slider on the canvas.
2. **CRDT Merge**: The client-side Yjs framework records a delta update (Yjs transaction log).
3. **WebSocket Transit**: The delta update is serialized into binary and transmitted via WebSocket to the backend collaboration channel.
4. **Redis Broadcast**: The WebSocket Server registers the state change, writes the update to PostgreSQL for persistence, and broadcasts the binary update to all other connected client rooms.
5. **DOM Sync**: Other client applications merge the binary delta into their local visual Yjs models, causing the node to move smoothly or metrics config values to update in their browsers.
