# Component Specification: Virtual Machine (Compute)

This document outlines the property variables, simulation parameters, and mathematical performance curves modeled for Virtual Machines.

---

## 1. Component Configuration Fields
* **Instance Type Size**: Selectable pre-configured bounds (e.g. `t3.micro`, `m5.large`, `c5.2xlarge`).
* **Cores ($N$)**: $1$ to $128$ vCPUs.
* **Core Speed ($F$)**: $1.0\text{ GHz}$ to $4.0\text{ GHz}$.
* **RAM Allocation ($M$)**: $512\text{ MB}$ to $512\text{ GB}$.
* **Thread Pool Limit**: Maximum size of execution worker threads ($1$ to $5,000$).
* **Connection Backlog**: Maximum size of the OS socket listening queue before connections are refused.

---

## 2. Simulation Logic
* **Context Switching Overhead**: Processing multiple threads concurrently degrades processing efficiency:
  $$\text{Overhead Factor} = 1.0 + \gamma \times \max\left(0, \frac{\text{Active Threads} - N}{N}\right)$$
  Where $\gamma \approx 0.02$. If active thread count exceeds physical cores, processing slows down.
* **GC (Garbage Collection) Simulation**: For JVM runtime nodes, memory accumulation triggers GC sweeps. Minor sweeps block threads for $20\text{ms}$ to $50\text{ms}$ periodically, and major sweeps freeze the VM state for $2\text{s} - 5\text{s}$.

---

## 3. Visual Representation
* **Icon**: Monochromatic rack-mount server.
* **Color Accent**: Gray card body, green border under healthy load.
* **Metrics Overlay**: Live charts showing CPU and Memory bars, request throughput, and active thread counts.
