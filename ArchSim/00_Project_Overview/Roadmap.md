# ArchSim Project Roadmap

This roadmap outlines the milestones, release phases, and feature progression for ArchSim.

---

## Milestone 1: Core Canvas & Networking (Month 1-3)
* **Goal**: Build the infinite visual canvas engine and the network path routing simulator.
* **Key Deliverables**:
  * React + React Flow/Custom HTML5 Canvas wrapper to support up to 5,000 components smoothly.
  * Basic component library: Client, VM, Gateway, Load Balancer.
  * Real-time connection routing: calculation of distance-based propagation delay, TCP/TLS handshake emulation.
  * Linear and Burst traffic profile generators.

---

## Milestone 2: Simulation Engine & Resource Modeling (Month 4-6)
* **Goal**: Implement the deterministic Discrete Event Simulation (DES) scheduler and resource pools.
* **Key Deliverables**:
  * Core Event Scheduler in Spring Boot and Javascript (synchronized execution models).
  * CPU/RAM/Bandwidth resource tracking for compute and database components.
  * Internal queuing simulation (FIFO, Priority, RED) for all compute nodes.
  * Rate-limiting configurations (Token Bucket) and basic circuit breaker support.

---

## Milestone 3: Storage, Caching, and Message Queues (Month 7-9)
* **Goal**: Introduce stateful storage components and synchronization protocols.
* **Key Deliverables**:
  * Cache engines: Redis & Memcached with LRU/LFU eviction rules.
  * Databases: PostgreSQL & NoSQL simulations, modeling write-ahead logs, locks, index scans.
  * Replication simulation: Master-replica delay, read replicas, and Raft consensus leader election simulation.
  * Event streaming: Kafka (Topic, Partition, Consumer Groups) and RabbitMQ (Exchanges, Queues).

---

## Milestone 4: Telemetry & Interactive Diagnostics (Month 10-12)
* **Goal**: Build observability tools to let users monitor simulation states.
* **Key Deliverables**:
  * Prometheus-style metrics dashboard in the right inspector panel.
  * Real-time request visualizer: packets flowing across connectors.
  * Interactive Distributed Tracing viewer (Jaeger-like view) for individual requests.
  * Incident panel: trigger CPU spikes, memory leaks, packet loss, or host kills.

---

## Milestone 5: Collaborative Multiplayer & AI Reviewer (Month 13-15)
* **Goal**: Introduce real-time collaboration and AI-driven architecture reviews.
* **Key Deliverables**:
  * Real-time multiplayer synchronization via WebSockets and Yjs/Automerge.
  * Collaborative canvas editing (shared cursors, concurrent updates).
  * AI Architect: Analyzes canvas structure for single points of failure (SPOFs), scaling bottlenecks, and security holes.
  * Interview Mode: Architectures are tested against pre-defined templates (e.g., "Scale to 10M users") and scored.
