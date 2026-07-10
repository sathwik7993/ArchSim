# Component Specification: Relational Database

This document outlines the simulation properties, connection pool constraints, transactions locking delay, and IOPS models used for Relational Databases.

---

## 1. Property Variables
* **Database Engine**: `POSTGRESQL` or `MYSQL` mode.
* **Max Connections Limit**: Maximum database connection pool ($10$ to $10,000$).
* **Read Replicas Link**: Routing paths to replica nodes (synchronous or asynchronous).
* **Buffer Pool Size**: RAM reserved for indexing and caching database pages.
* **Disk Type**: HDD ($150\text{ IOPS}$), SSD ($10,000\text{ IOPS}$), or Provisioned IOPS NVMe ($100,000\text{ IOPS}$).

---

## 2. Relational Simulation Logic

### 2.1. Transaction Lock Contention
When a write query requires a lock on a table or row:
* If the target row/table is locked by another transaction, the incoming write is added to a lock queue.
* The delay accumulates linearly until the lock holder commits or aborts:
  $$T_{\text{wait}} = \sum_{h=1}^{H} T_{\text{commit\_h}}$$
* If $T_{\text{wait}} > \text{Statement Timeout}$ ($5,000\text{ms}$ by default), the database aborts the transaction with a lock timeout error.

### 2.2. Query Execution Performance
* **Index Scan vs. Full Table Scan**: The model checks if a database index is available. A table scan consumes exponentially higher CPU and disk IOPS based on table size:
  $$\text{IOPS Consumed} = \begin{cases}
  \log_2(\text{Table Rows}) & \text{Index Scan} \\
  \text{Table Rows} & \text{Full Table Scan}
  \end{cases}$$
* **Connection Pool Saturation**: If connection attempts exceed the configured maximum connection limit, incoming connection requests block. If they block for longer than the connection timeout (e.g. $30\text{ seconds}$), they fail.
