# ArchSim Queuing Simulation Specification

This document details the mathematical queuing theory models, buffer disciplines, and backpressure algorithms modeled inside compute, database, and messaging nodes.

---

## 1. Queue Models & Mathematical Formulations
Every node contains internal buffers modeled using queuing theory (Kendall's notation: $M/M/c/K$).

### 1.1. $M/M/1/K$ Queuing System (Single Core / Thread VM)
For a component with arrival rate $\lambda$, service rate $\mu$, and buffer capacity $K$:
* **Traffic Intensity ($\rho$)**:
  $$\rho = \frac{\lambda}{\mu}$$
* **Probability of $n$ requests in the system ($P_n$)**:
  $$P_n = \frac{1 - \rho}{1 - \rho^{K+1}} \rho^n$$
* **Blocking Probability (Request Drop Rate $P_K$)**:
  $$P_K = \frac{1 - \rho}{1 - \rho^{K+1}} \rho^K$$
* **Average Queue Waiting Time ($W_q$)**:
  $$W_q = \frac{L}{\lambda(1 - P_K)} - \frac{1}{\mu}$$
  Where $L$ is the average number of requests in the system.

---

## 2. Queue Buffer Disciplines
Users can configure components to process queues using different rules:

### 2.1. FIFO (First-In, First-Out)
Requests are processed strictly in the order they arrive. Under high load, this causes **Buffer Bloat** (requests wait in queue for seconds before timeout occurs, leading to waste of resources).

### 2.2. LIFO (Last-In, First-Out) with Decaying TTL
Processes the newest requests first. If a queue fills up, older requests are dropped. This prevents processing request payloads that clients have already aborted.

### 2.3. RED (Random Early Detection)
Typically configured on load balancers. When the queue size ($q$) exceeds a minimum threshold ($\text{min}_{\text{th}}$), the queue begins dropping incoming requests randomly before the buffer is completely full, signaling upstream clients to backoff:

$$P_{\text{drop}}(q) = \begin{cases} 
0 & q < \text{min}_{\text{th}} \\
P_{\text{max}} \times \left(\frac{q - \text{min}_{\text{th}}}{\text{max}_{\text{th}} - \text{min}_{\text{th}}}\right) & \text{min}_{\text{th}} \le q \le \text{max}_{\text{th}} \\
1.0 & q > \text{max}_{\text{th}}
\end{cases}$$

---

## 3. Backpressure Propagation
When a node's queue is full, it signals the upstream sender component. The upstream component must react by slowing down its transmission rate or buffering requests internally, propagating backpressure upstream until the traffic generator throttle limits are hit.
