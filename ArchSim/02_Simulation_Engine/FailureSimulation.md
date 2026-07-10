# ArchSim Failure Simulation Specification

This document details the chaos engineering framework, scheduled failure injection pipelines, and cascading failure propagation models within ArchSim.

---

## 1. Chaos Engine Framework
The Chaos Engine allows users to schedule or manually inject failure states. The engine acts as an event injector that schedules `FAIL_COMPONENT` and `RECOVER_COMPONENT` events into the Event Scheduler:

```
Virtual Time T: User injects "Kill DB" event
   │
   ▼
[Event Scheduler] ──(T)──► [Handler: FAIL_DB] ──► Changes DB State to FAILED
                                                      │
                                                      ▼
[Downstream Services] ◄──(Cascading Failures)─────────┘
  - Connections Timeout
  - Retry Storms
  - Thread Pools Saturate
```

---

## 2. Cascading Failure Models
ArchSim simulates how a single failure in a database or microservice propagates throughout an entire system topology.

### 2.1. Retry Storms
When a downstream database fails or degrades, upstream services attempt retries:
$$\text{Request Volume}_{\text{upstream}} = \text{Base QPS} \times \left(1.0 + \sum_{i=1}^{\text{Max Retries}} P_{\text{retry\_success}}^i\right)$$
If downstream systems are bottlenecked, this retry behavior spikes traffic, causing CPU exhaustion or memory saturation (OOM) on healthy services.

### 2.2. Thread Pool Exhaustion (Blocked Wait)
If Service A calls Service B with a timeout of $5\text{ seconds}$ and Service B crashes, Service A holds its execution threads open waiting for B to respond.
* **Saturation Condition**:
  $$\text{Thread Saturation} = \text{Request Arrival Rate} \times \text{Timeout Duration} > \text{Max Threads}$$
* **Result**: Once all thread pools are saturated, Service A immediately drops new incoming traffic (returning `HTTP 503 Service Unavailable`).

### 2.3. Cache Miss Storms (Cache Stampede)
If cache nodes fail, all request queries bypass the caching layer and hit databases directly (cache stampede/miss storm). This spikes database read traffic:
$$\text{Read Volume}_{\text{db\_miss\_storm}} = \text{Read QPS} \times \left(1.0 - \text{Hit Ratio}_{\text{cache}}\right)$$
When $\text{Hit Ratio}_{\text{cache}} \to 0$, the database disk read IOPS is overwhelmed, causing database queue delays to grow exponentially.

### 2.4. Cascading Failure Propagation Equation
For any upstream service $A$ that depends on a downstream service $B$, the probability of $A$ transitioning to a degraded or failed state ($P_F(A, t)$) is modeled as:

$$P_F(A, t) = (1 - \chi_A) \times \left[ P(\text{Timeout Saturation}) + P(\text{Thread Pool Saturated}) \right] + \chi_A \times P_{\text{fallback}}$$

Where:
* $\chi_A \in \{0, 1\}$ represents whether a Circuit Breaker is active on service $A$'s calls to $B$.
* If $\chi_A = 0$ (no circuit breaker), the failures cascade directly to the upstream threads pool.
* If $\chi_A = 1$ (circuit breaker active), the call immediately fails-fast with a fallback response probability ($P_{\text{fallback}}$), protecting service $A$'s internal resources from exhaustion.
