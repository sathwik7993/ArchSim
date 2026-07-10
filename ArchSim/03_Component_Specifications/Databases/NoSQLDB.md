# Component Specification: NoSQL Database

This document details the configuration parameters, consistency models, replication strategies, and latency curves for NoSQL Databases.

---

## 1. Configuration Fields
* **Partitioning Keys**: Configuration of hash keys to distribute data across virtual partitions.
* **Nodes / Cluster Size**: Number of active replica nodes in the ring ($1$ to $100$).
* **Replication Factor (RF)**: Number of nodes storing copies of each partition key data.
* **Consistency Level**:
  * `ONE`: Succeeds once a single replica node acknowledges the write/read.
  * `QUORUM`: Requires acknowledgment from the majority of replicas:
    $$\text{Quorum Count} = \left\lfloor \frac{\text{RF}}{2} \right\rfloor + 1$$
  * `ALL`: Requires acknowledgment from all replicas.
* **Storage IOPS Cap**: Disk speed limits per cluster node.

---

## 2. Runtime State Variables
* **Cluster Capacity**: Bytes utilized across the NoSQL ring.
* **Consistency Check Failures**: Rate of read request failures due to stale consensus data.
* **Partition Skewness**: Standard deviation of resource utilization across partition nodes.

---

## 3. Failure Modes
* **Consistency Divergence**: If nodes fail, eventual replication delay creates state mismatching between replicas, returning stale data.
* **Split Brain**: Partitioning splits the cluster into sub-rings, rejecting writes if a Quorum cannot be achieved.

---

## 4. Simulation Logic
When a query is dispatched to the NoSQL cluster:
1. **Partition Hashing**: The request is hashed by key to determine target replica nodes in the ring.
2. **Consensus Evaluation**:
   * For reads with strong consistency (Quorum/All), the coordinator queries replicas, resolving values using timestamps.
   * If replicas are unreachable, writes block. If quorum is not achieved, the query fails with `Write Timeout / Consensus Error`.
3. **IOPS Cost**: Each node involved in the write/read consumes CPU and IOPS capacity.
