# Component Specification: Message Queue / Event Stream

This document outlines the properties, ingestion flows, consumer group routing, and lag calculations used for simulated Message Queues (RabbitMQ) and Event Streams (Kafka).

---

## 1. Configuration Settings
* **Message Broker Class**: `KAFKA` (partitioned event streams) or `RABBITMQ` (exchanges and queue routing).
* **Partitions / Queues**: $1$ to $100$ parallel channels.
* **Storage Mode**: In-memory queue or persisted to Disk.
* **Consumer Group Config**: Mapping of consumer service nodes to topic queues.
* **Max Message Count Limit**: Queue buffer limit before dropping incoming messages or blocking producers (backpressure).

---

## 2. Simulation Logic

### 2.1. Kafka Partition Allocation
* Writes to Kafka are distributed across partitions using hashing keys or round-robin strategies.
* Consumers within a consumer group partition the topics:
  $$\text{Partitions Per Consumer} = \max\left(1, \left\lfloor \frac{\text{Partitions Count}}{\text{Consumers Count}} \right\rfloor\right)$$
* If the number of consumers exceeds the partition count, excess consumers remain idle, consuming no messages.

### 2.2. Consumer Lag Tracking
The queue engine tracks write offsets (Producer Head) and read offsets (Consumer Head) to calculate consumer lag:

$$\text{Consumer Lag}(t) = \text{Offset}_{\text{producer}}(t) - \text{Offset}_{\text{consumer}}(t)$$

* If Consumer Lag grows continuously:
  * The queue buffer size increases, consuming more RAM.
  * Message processing latency increases.
  * **Alert**: The simulator fires a `CONSUMER_LAG_WARNING` to the metrics dashboard.
* If a consumer service node crashes, the messaging engine schedules a **Rebalance Event**, reassessing partition assignments to the remaining healthy consumer nodes (triggering a $2\text{s} - 5\text{s}$ message delivery freeze).
