# ArchSim Product Principles

This document outlines the core principles governing the design, simulation mechanics, and user experience of ArchSim. Every component, feature, and architectural choice must align with these rules.

---

## Rule 1: Everything has State

A component in ArchSim is never just an icon or a static diagram element. It is a live, stateful entity containing:
1. **Configuration State**: Set by the user (e.g., database max connection limit, cache eviction policy like LRU/LFU, queue size limit).
2. **Runtime Memory State**: Dynamically updated by the simulator (e.g., items currently in the cache, connections actively open, messages in flight in a queue, JVM heap usage).
3. **Operational State**: The health and status of the component (e.g., `HEALTHY`, `DEGRADED`, `CRITICAL`, `FAILED`).

### Example: Redis Cache Instance
* **Configuration State**: Max memory (e.g., 2GB), Eviction Policy (`volatile-lru`), Replica count (1).
* **Runtime State**: Memory utilized (e.g., 1.4GB), Hit ratio (e.g., 78.4%), Active clients (124), Commands/sec (12,500).
* **Failure State**: Out-of-memory eviction storm, high packet-loss degraded mode.

---

## Rule 2: Everything Consumes Resources

Every request, execution step, and packet transmission in ArchSim consumes concrete simulation resources. There are four primary resource pools modeled for every compute, storage, and cache node:

1. **CPU Cycles**: Computed as a function of processing complexity and serialization overhead.
   $$U_{\text{cpu}}(t) = \min\left(100.0, \frac{\sum_{i=1}^{M(t)} C_i}{N \times F \times \Delta t} \times 100\right)$$
   Where:
   * $M(t)$ is the number of active requests on the node at tick $t$.
   * $C_i$ is the cycle complexity of request $i$.
   * $N$ is the number of cores, $F$ is the frequency in GHz, and $\Delta t$ is the tick duration in seconds.
2. **Memory (RAM)**: Measured in megabytes/gigabytes. Storage engines consume memory for buffer pools, and queue nodes consume memory based on message sizes.
3. **Thread Pool / Connection Capacity**: The absolute number of concurrent tasks a component can process or queue up.
4. **Network Bandwidth**: Network interfaces have hard throughput limits (e.g., 1 Gbps, 10 Gbps). Request rates that exceed bandwidth result in transmission delays and packet drops.

If a component's resources are saturated:
* Latency increases (queuing delay).
* Requests are dropped (buffer/connection pool exhaustion).
* Failures propagate downstream.

---

## Rule 3: Nothing Happens Instantly

Every operation requires a non-zero time to complete. We calculate absolute latency by tracing the cumulative time taken across every subsystem.

### The Latency Pipeline Model
When a client sends a request to a service, the simulator calculates latency as:

$$\text{Total Latency} = T_{\text{DNS}} + T_{\text{TCP}} + T_{\text{TLS}} + T_{\text{Network}} + T_{\text{Queue}} + T_{\text{Process}} + T_{\text{Backend}} + T_{\text{Network\_Return}}$$

Where:
* **$T_{\text{DNS}}$**: DNS lookup delay (models cached vs cold lookups).
* **$T_{\text{TCP}}$**: Handshake delay ($1 \times \text{RTT}$ for TCP).
* **$T_{\text{TLS}}$**: Secure handshake delay ($1 \times \text{RTT}$ for TLS 1.3, $2 \times \text{RTT}$ for TLS 1.2).
* **$T_{\text{Network}}$**: Propagation delay based on distance ($d / v$) + Transmission delay ($\text{Data Size} / \text{Bandwidth}$).
* **$T_{\text{Queue}}$**: Time spent waiting in the component's internal thread or connection queue.
* **$T_{\text{Process}}$**: Internal CPU execution time.
* **$T_{\text{Backend}}$**: Sequential or parallel calls to databases, caches, or microservices.

```
Client ──[TCP + TLS Handshake: 2.0 RTT]──> Gateway ──[Queue Wait: 15ms]──> Service ──[DB Query: 45ms]──> Response
```

---

## Rule 4: Failures are First-Class Citizens

Outages and performance degradation are not edge cases; they are core simulation features. ArchSim supports three types of failure modalities:

### 1. Hard Failures (Crashes)
* Service process terminates.
* Port closes; TCP connection attempts are rejected immediately.
* Network links cut (simulating a cut fiber line).

### 2. Soft Failures (Degradation)
* **Memory Leaks**: JVM/Process memory grows linearly until triggering Out-Of-Memory (OOM) killer.
* **GC Pauses**: Periodic blocks where execution freezes for 100ms - 5000ms.
* **CPU Throttling**: Triggered when compute nodes reach 100% capacity, scaling execution time factors by $2\times$ or $5\times$.

### 3. Network Failure (Transit)
* **High Packet Loss**: Drops TCP packets, triggering retransmission delays.
* **Jitter**: Creates unpredictable delay variations.
* **Network Partitions**: Splits nodes into unreachable sub-graphs, triggering split-brain or replica divergence.

---

## Rule 5: Simulation Always Explains Itself

The primary value of ArchSim is educational. The simulator must demystify systems by tracing cause-and-effect paths. 

Instead of showing a generic "Server Error 500", the UI must provide clear causality graphs:

* **What happened?**: `Gateway latency spiked to 4.2s`
* **Why did it happen?**: `The User Service connection pool (max: 20) was saturated because PostgreSQL execution time increased due to a table lock.`
* **When did it begin?**: `At 00:14:32 (Virtual Time), during the 'Flash Sale' traffic spike.`

The simulator provides interactive **Distributed Tracing (similar to Jaeger/Zipkin)**, allowing users to select any individual request and see exactly how much latency was accumulated at each hop and why.
