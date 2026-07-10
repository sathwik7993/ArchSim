# AI Analyzer Specification

This document details the architecture, parsing models, and rules used by the AI review engine to analyze canvas layouts.

---

## 1. Analysis Flow
The AI Analyzer parses the canvas topology graph (stored as a JSON format of nodes and links) to identify architectural issues before starting a simulation run.

```
[Canvas JSON schema] ──► [SPOF & Path Parser] ──► [Heuristic Rule Validator]
                                                          │
                                                          ▼
[JSON Report Details] ◄── [Structured Prompt Review] ◄────┘
  - Bottlenecks found
  - Single Points of Failure
  - Cost Optimization suggestions
```

---

## 2. Target Review Rules

### 2.1. Single Point of Failure (SPOF) Detection
* **Rule**: Identify paths from Client node to Datastore node. If any single VM or database node exists in all valid paths, flag it as a SPOF.
* **Warning Message**: `"The User VM is a Single Point of Failure. If this instance crashes, all traffic to User Database fails. Add a Load Balancer and scale replicas to >= 2."`

### 2.2. Connection Pool Matching
* **Rule**: Compare upstream service thread pools with database connection limits.
* **Trigger**: If $\sum (\text{Upstream Thread Pools}) > \text{DB Max Connections}$:
  * **Warning**: `"Upstream thread limits exceed database connection capacity. Under peak load, threads will block waiting for DB slots, leading to connection timeouts."`

### 2.3. Caching Validation
* **Rule**: Databases with read volume $>1,000\text{ QPS}$ should have a Redis cache node preceding them.
* **Suggestion**: `"The User DB is experiencing heavy read traffic. Adding a Redis cache layer will reduce load by up to 80%."`
