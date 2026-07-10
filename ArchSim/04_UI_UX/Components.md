# ArchSim UI Components Specification

This document details the visual design specifications for nodes and links rendered on the ArchSim interactive canvas.

---

## 1. Node Visual Anatomy
Every node on the canvas shares a common structural layout designed to display runtime status at a glance without opening the inspector sidebar.

```
+------------------------------------------------------+
|  [Icon] Node Name                       [Status Tag] |
|  [CPU Bar  ██████░░░░ 60%] [RAM Bar ████░░░░░░ 40%]    |
|------------------------------------------------------|
|  Metrics: 1.2k QPS | Error: 0.1% | Active Conn: 45   |
|------------------------------------------------------|
|  Queue: [██████████] 100/100 (Saturated!)           |
+------------------------------------------------------+
```

### 1.1. Header Section
* **Icon**: Standard monochromatic SVGs representing the component class (e.g., server rack for VM, database cylinder for PostgreSQL, letter envelope for MQ).
* **Component Name**: Custom name (editable) + Component Type (e.g., `user-db-replica [PostgreSQL]`).
* **Status Tag**: A color-coded pills:
  * `HEALTHY` (Green background, white text)
  * `THROTTLED` (Orange background, white text)
  * `FAILED` (Red background, white text)

### 1.2. Telemetry Gauges (Sub-headers)
* **CPU Progress Bar**: Horizontal bar. Background matches `--border-subtle`. Fill color:
  * Green for $0\% - 75\%$ usage.
  * Orange/Yellow for $75\% - 90\%$ usage.
  * Red for $>90\%$ usage.
* **Memory Progress Bar**: Models byte capacity relative to configured thresholds.

### 1.3. Active Stats Summary
* Displays live values for **QPS (Query Per Second)**, **Latency (P99)**, and **Active Connections/Threads**.

### 1.4. Queue/Buffer Meter
* Displays the current depth of internal event or message queues. If a queue exceeds $90\%$ of configured maximum capacity, the border of the meter flashes red to indicate backpressure issues.

---

## 2. Node Category Visual Styles

### 2.1. Compute Nodes (VMs, Kubernetes Pods, Lambda Functions)
* **Shape**: Rounded rectangles (`border-radius: 6px`).
* **Accent**: Light left border accent (`border-left: 4px solid var(--color-active)`).
* **Visual States**:
  * **Crashed**: Grayed out, diagonal pattern overlay (`repeating-linear-gradient`).
  * **Scaling Up/Down**: Pulse animation on the border (CSS transition).

### 2.2. Databases & Storage (Postgres, Cassandra, S3)
* **Shape**: Cylinder-like capsule shape or solid square card with database cylinder icon.
* **Accent**: Double-bordered outlines indicating persistence.
* **Replication Links**: Dashed lines with replication direction arrows indicating sync/async database connections.

### 2.3. Caching Nodes (Redis, CDN)
* **Shape**: Beveled rectangle or octagonal layout.
* **Hit/Miss Telemetry**: Displays a small real-time percentage text (e.g., `Hit Rate: 84%`).

### 2.4. Messaging (Kafka, RabbitMQ)
* **Shape**: Linear horizontal lanes representing queue/topic streams.
* **Visual Queue Indicator**: Shows dots moving through segments representing messages waiting to be consumed.

---

## 3. Link (Connector) Visual Styles
Connectors represent physical or logical network paths. They are interactive lines connecting node ports.

### 3.1. Routing Animation (Active Traffic)
* When requests are moving between components, small glowing circles (packets) travel along the connector path.
* **Velocity**: The speed of these visual packets matches the network latency (higher latency = slower moving packets).
* **Density**: The frequency of visual packets represents request rate (higher QPS = higher visual density).

### 3.2. Link Failure States
* **Severed Link**: Link line becomes red and breaks in the center with a gap. Packets hitting the break dissolve into red sparks (representing dropped packets).
* **Congested Link**: The connection line thickness doubles and changes to orange. Visual packets bunch together and queue up along the line.
