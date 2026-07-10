# Component Specification: Event Stream (Kafka)

This document details the configuration parameters, log retention, and consumer allocation logic modeled for Event Streams.

---

## 1. Configuration Fields
* **Partition Count**: Number of parallel lanes for message writes ($1$ to $100$).
* **Replication Factor**: Replica brokers holding copies of partition logs.
* **Retention Period**: Time window (in virtual hours) message bytes remain in logs before deletion.
* **Batch Ingest Size**: Buffer bytes count before writing to disk logs.

---

## 2. Runtime State Variables
* **Topic Throughput**: Bytes/sec written and read across topics.
* **Active Consumer Groups**: Number of subscriber groups actively polling logs.
* **Broker Lag**: Sync delays between primary partition leader and replica followers.

---

## 3. Failure Modes
* **Partition Unavailability**: If a broker crashes and no replication backup exists, topic reads and writes fail for partitions assigned to that broker.
* **Consumer Group Rebalance Storm**: Rapidly adding/removing consumer instances triggers leader election pauses, temporarily halting message deliveries.

---

## 4. Simulation Logic
1. **Producer Write**: Producers post data to the topic. The gateway assigns a partition index.
2. **Replication Sync**: Leader broker replicates log commits asynchronously to follower partitions.
3. **Consumer Poll**: Active consumers poll their assigned partitions. If message lag grows, the consumer's heap memory utilization scales up linearly.
