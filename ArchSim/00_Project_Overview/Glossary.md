# ArchSim Glossary

This glossary defines technical terms, simulation-specific variables, and acronyms used throughout the ArchSim codebase and documentation.

---

### A
* **API Gateway**: A reverse proxy that routes client requests, enforces authentication, and applies rate-limiting policies before forwarding traffic to downstream services.
* **Autoscaler**: A component that dynamically scales compute instances up or down based on metrics thresholds (e.g., CPU > 80%).

### B
* **Bandwidth**: The maximum rate of data transfer across a network connection, measured in bits per second (bps).
* **Buffer Bloat**: High latency caused by excessive queuing of packets or requests in large buffers.
* **Bulkhead**: A design pattern that isolates resources (e.g., separate thread pools) to prevent a failure in one service from cascading to others.

### C
* **Circuit Breaker**: A pattern that prevents a service from making calls to a degraded downstream system. States: `CLOSED` (traffic flows), `OPEN` (traffic blocked/fail-fast), `HALF-OPEN` (testing recovery).
* **Connection Pool**: A cache of database connections maintained so that connections can be reused, avoiding the overhead of establishing a new connection for every request.
* **Consensus (Raft/Paxos)**: Protocols that ensure distributed nodes agree on a single data value or system state despite failures.
* **CPU Throttling**: The slowing down of execution speed when compute resources are fully saturated.

### D
* **Deterministic Execution**: A simulation run where the exact same inputs and seed value yield the exact same timeline and outputs every time.
* **Discrete Event Simulation (DES)**: A simulation model where the system state changes at discrete points in time when an event occurs, rather than continuously.
* **DNS Resolution**: The process of translating a human-readable domain name (e.g., `api.archsim.io`) to an IP address, contributing network latency.

### G
* **Garbage Collection (GC) Pause**: A freeze in execution during memory reclamation by the runtime environment (e.g., JVM), creating periodic latency spikes.

### J
* **Jitter**: The statistical variance in packet arrival time (latency) over a network connection.

### L
* **Leaky Bucket**: A rate-limiting algorithm that queues incoming requests and processes them at a constant, steady rate.
* **Load Balancer**: A device that distributes incoming network traffic across a group of backend servers to prevent overload.

### M
* **Metrics Ingestion**: The high-frequency collection and aggregation of resource usage and throughput metrics from simulated components.

### O
* **Out of Memory (OOM)**: A failure state where a component runs out of physical memory allocation, triggering process termination.

### P
* **Percentiles (P50, P95, P99)**: Statistical measures of latency. For example, P99 indicates that 99% of requests completed faster than this duration, while 1% took longer.
* **Propagation Delay**: The time it takes for the head of a signal to travel from the sender to the receiver ($T = \text{Distance} / \text{Speed of Light in Medium}$).

### R
* **Random Early Detection (RED)**: A active queue management algorithm that drops packets early when queue buffer sizes begin to fill to signal TCP endpoints to back off.
* **Replication Lag**: The delay between when a write is committed on the primary database and when it is successfully applied on a read replica.
* **Round-Trip Time (RTT)**: The time it takes for a data packet to travel from sender to receiver and back again.

### T
* **Token Bucket**: A rate-limiting algorithm that allows short bursts of traffic up to a maximum capacity while maintaining a long-term average limit.

### W
* **Write-Ahead Log (WAL)**: A family of techniques for providing atomicity and durability in database systems, where updates are written to a log file before being applied to the database files.
