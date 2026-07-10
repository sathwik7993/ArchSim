# ArchSim Resource Engine Specification

This document details the mathematical models and algorithms used to simulate CPU, RAM, Disk, and Network resource consumption during request processing.

---

## 1. CPU Saturation and Throttling
Every request processed by a compute node (VM, container, process) consumes CPU cycles based on request complexity ($C_r$, measured in instruction cycles) and processing volume.

### 1.1. CPU Usage Calculation
At any virtual tick $t$, the CPU utilization percentage ($U_{\text{cpu}}$) of a node with $N$ cores and core frequency $F$ (in GHz) is calculated as:

$$U_{\text{cpu}}(t) = \min\left(100.0, \frac{\sum_{i=1}^{M(t)} C_i}{N \times F \times \Delta t} \times 100\right)$$

Where $M(t)$ is the number of requests actively processing on the node at tick $t$, and $C_i$ is the cycles consumed by request $i$.

### 1.2. Throttling Multiplier
When $U_{\text{cpu}} \ge 90\%$, the component enters a **Throttled State**. The processing time ($T_{\text{proc}}$) of all active and incoming requests on that node scales exponentially:

$$T_{\text{proc\_throttled}} = T_{\text{proc}} \times \left(1.0 + \alpha \times e^{\beta \times (U_{\text{cpu}} - 90)}\right)$$

Where typical constants are $\alpha = 0.5$ and $\beta = 0.2$. This models the degradation of scheduling queue efficiency at high CPU utilization.

---

## 2. Memory (RAM) Allocation & Out of Memory (OOM)
Compute, caching, and database nodes consume memory based on:
1. **Base Memory**: Flat memory consumed by the runtime framework (e.g., $256\text{MB}$ for standard Java VM).
2. **Buffer Pools / Caches**: Explicitly configured blocks (e.g., PostgreSQL `shared_buffers`).
3. **Queue Accumulation**: Inflight requests stored in memory queue buffers.
   $$\text{RAM}_{\text{queue}}(t) = \sum_{q=1}^{Q(t)} \text{Message Size}_q$$

### 2.1. OOM Crash Condition
If total memory usage ($M_{\text{used}}$) exceeds the node's configured maximum memory allocation ($M_{\text{limit}}$):

$$M_{\text{used}}(t) > M_{\text{limit}} \implies \text{Trigger OOM Killer Event}$$

* The component transition to `FAILED` state.
* The internal process crashes.
* Active connections are instantly closed (TCP RST sent).

---

## 3. Storage I/O Operations (IOPS) & Disk Latency
Stateful nodes (Databases, Message Queues) are constrained by Disk Read/Write IOPS capabilities.
* **Disk Write Overhead (WAL)**: Every database transaction writes to the Write-Ahead Log, bottlenecked by disk IOPS:
  $$T_{\text{disk\_write}} = \frac{\text{Data Size}}{\text{Disk Sequential Throughput}} + \frac{1}{\text{IOPS\_Cap}}$$
* **Queue contention**: Sequential disk operations are queued, and disk wait time accumulates linearly under load.
