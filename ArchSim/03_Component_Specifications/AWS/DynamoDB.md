# Component Specification: Amazon DynamoDB

This document details the capacity metrics, consistency settings, and throttling rules for simulated Amazon DynamoDB databases.

---

## 1. Configuration Fields
* **Billing Mode**: `PROVISIONED` or `ON_DEMAND`.
* **Read Capacity Units (RCUs)**: Provisioned read limits ($1$ RCU = 1 strong read/sec or 2 eventual reads/sec for 4KB objects).
* **Write Capacity Units (WCUs)**: Provisioned write limits ($1$ WCU = 1 write/sec for 1KB objects).
* **Global Tables**: List of regions to replicate data rings.

---

## 2. Runtime State Variables
* **Consumed RCUs / WCUs**: Current capacity usage indicators.
* **Throttled Request Count**: Percentage of requests rejected due to capacity limits.
* **Global Replication Lag**: Latency in milliseconds across regional replicas.

---

## 3. Failure Modes
* **Hot Partition Exception**: Even if total cluster capacity is within limits, writing heavily to a single partition key key triggers `ProvisionedThroughputExceededException` errors.

---

## 4. Simulation Logic
1. **Capacity Cost Calculation**: For every incoming database transaction:
   * Eventual Read of 8KB: Consumes $\lceil 8/4 \rceil / 2 = 1\text{ RCU}$.
   * Strong Read of 8KB: Consumes $\lceil 8/4 \rceil = 2\text{ RCUs}$.
   * Write of 3.5KB: Consumes $\lceil 3.5/1 \rceil = 4\text{ WCUs}$.
2. **Throttle Check**:
   * If $\text{Consumed Capacity} > \text{Provisioned Capacity}$:
     * Rejects request, returning `HTTP 400 (ProvisionedThroughputExceeded)`.
3. **Global Sync**: Writes replicate to global tables regions using network delay.
