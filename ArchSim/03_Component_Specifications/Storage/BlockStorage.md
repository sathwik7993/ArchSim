# Component Specification: Block Storage

This document details the seek times, read/write throughput calculations, and IOPS throttling curves for Block Storage (Amazon EBS-style).

---

## 1. Configuration Fields
* **Storage Type**:
  * `SSD (gp3)`: General purpose solid-state (3,000 IOPS base, scaling to 16,000).
  * `NVMe (io2)`: Provisioned IOPS solid-state (up to 64,000 IOPS).
  * `HDD (st1)`: Throughput optimized magnetic spinning disks (low IOPS, high sequential bandwidth).
* **IOPS Capacity**: Hard limit of disk operations per second.
* **Throughput Limit (MB/s)**: Hard bandwidth caps for sequential transfers.

---

## 2. Runtime State Variables
* **Active IOPS Count**: Active disk operations per second.
* **IO Wait Latency**: Delay in milliseconds due to disk queue blockings.
* **Volume Capacity**: Bytes utilized on the storage system.

---

## 3. Failure Modes
* **IOPS Exhaustion**: Exceeding the IOPS cap causes read/write operations to queue up, spiking database statement latencies.

---

## 4. Simulation Logic
When a file block operation is executed:
1. **Seek Delay**: Computes mechanical seek time ($T_{\text{seek}} \approx 0.1\text{ms}$ for SSD, $8.0\text{ms}$ for HDD).
2. **Transfer Delay**: Computes bandwidth transit time:
   $$T_{\text{transfer}} = \frac{\text{Data Size}}{\text{Throughput Limit}}$$
3. **Queue Throttling**:
   * If $\text{Active IOPS} > \text{IOPS Capacity}$:
     * Queue wait time increases:
       $$T_{\text{wait}} = \frac{\text{Active IOPS} - \text{IOPS Capacity}}{\text{IOPS Capacity}} \times 10\text{ms}$$
     * Total storage delay is $T_{\text{seek}} + T_{\text{transfer}} + T_{\text{wait}}$.
