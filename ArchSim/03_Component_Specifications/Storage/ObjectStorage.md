# Component Specification: Object Storage

This document details the latency behaviors, API request models, and replication sync rules for Object Storage systems.

---

## 1. Configuration Fields
* **Storage Class**: Hot (active), Cold (infrequent access), Archive (glacier).
* **Cross-Region Replication**: Configured target backup buckets.
* **Lifecycle Rules**: Automatic transitions from Hot to Archive after $N$ virtual days.

---

## 2. Runtime State Variables
* **GET / PUT QPS**: Read and write API call frequencies.
* **Storage Bytes Size**: Aggregate bytes stored in the container bucket.
* **Replication Queue Bytes**: In-flight replication data waiting to sync.

---

## 3. Failure Modes
* **API Rate Limit Denials**: Hitting prefix API rate limits (e.g. 5,500 GETs/sec) drops requests with `SlowDown` errors.

---

## 4. Simulation Logic
1. **Request Verification**: Checks target storage class constraints.
   * If accessing Archive storage directly:
     * Returns an error or enforces a restore delay ($3\text{ to 5 virtual hours}$).
2. **Bandwidth Transfer**: Computes payload transit speed:
   $$T_{\text{transit}} = T_{\text{first\_byte\_latency}} + \frac{\text{Payload Size}}{\text{Connection Bandwidth}}$$
   Where $T_{\text{first\_byte\_latency}} \approx 20\text{ms}$.
3. **Replication trigger**: On PUT operations, if cross-region replication is active, schedules a sync task over network links.
