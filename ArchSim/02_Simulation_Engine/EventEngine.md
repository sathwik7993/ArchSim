# ArchSim Event Engine Specification

This document details the Discrete Event Simulation (DES) model, event message schemas, and handling loop rules of the simulation engine.

---

## 1. Discrete Event Simulation (DES) Model
ArchSim does not run continuous frame-by-frame loop calculations. Instead, it relies on a discrete event queue. The system state is updated only when an event occurs:

$$\text{State}_{t+1} = f(\text{State}_t, \text{Event})$$

Where an event is represented as a structured message scheduled to execute at a specific virtual timestamp $T_e$.

---

## 2. Event Lifecycle & Pipeline

```
  [Event Source] (e.g. Traffic Generator)
        │
        ▼
   [Event Queue] ──(Ordered by Priority: Te ASC)
        │
        ▼
 [Scheduler Loop] (Pulls top event where Te <= Tvirtual)
        │
        ├─► [Handler: HTTP_REQUEST] ──► Updates VM state, schedules DB_QUERY
        ├─► [Handler: DB_QUERY]     ──► Updates Postgres state, schedules NET_TRANSIT
        └─► [Handler: NET_TRANSIT]  ──► Schedules HTTP_RESPONSE at client
```

1. **Scheduling**: An event is generated with a timestamp $T_e$. It is pushed to a priority queue sorted by $T_e$ in ascending order.
2. **Dispatching**: The execution loop pops events from the queue where $T_e \le T_{\text{virtual}}$.
3. **Execution**: The event is passed to its designated component handler, which updates internal metrics, consumes resources, and schedules downstream events (e.g. an incoming gateway request generates a backend service event).

---

## 3. Event Object Schema
All events are serialized as JSON records inside the simulator core:
```json
{
  "eventId": "evt-88912-ab00",
  "scheduledTimeMs": 1774328400500,
  "eventType": "HTTP_REQUEST",
  "sourceId": "node-client-0",
  "targetId": "node-api-gateway",
  "payload": {
    "requestId": "req-999-234",
    "route": "/api/v1/users/profile",
    "payloadSizeB": 450,
    "headers": {
      "Authorization": "Bearer jwt-token-content"
    }
  }
}
```

### Supported Event Types
* `HTTP_REQUEST` / `HTTP_RESPONSE`: Edge request transmissions.
* `DB_READ` / `DB_WRITE` / `DB_COMMIT`: Database engine interactions.
* `CACHE_GET` / `CACHE_SET` / `CACHE_EVICT`: Cache operations.
* `FAIL_NODE` / `RECOVER_NODE`: Chaos failure injections.
* `AUTOSCALE_TICK`: Periodic check to scale compute clusters up/down.
