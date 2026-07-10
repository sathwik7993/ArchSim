# ArchSim Inspector Panel Specification

This document details the visual layouts and interface specifications of the right-hand Inspector Sidebar, which displays detailed configuration and real-time state information for selected components.

---

## 1. Inspector Panel Layout & Tabs
When a user clicks on any node on the canvas, the right-hand sidebar slides in. The panel is divided into four functional tabs to organize configuration options and telemetry:

```
+-------------------------------------------------------+
|  [Config]    [Metrics]    [Trace]    [Logs]           |
|-------------------------------------------------------|
|                                                       |
|  Select a tab above to view component details.        |
|                                                       |
+-------------------------------------------------------+
```

---

## 2. Tab Specifications

### 2.1. Config Tab
Contains dynamic form fields to configure the specific architectural variables of the selected component.
* **Component Metadata**: Edit custom name, description, region, and availability zone (AZ).
* **Hardware Allocations**: Slider inputs for Cores/Frequency, Memory Limits, and Bandwidth Cap (e.g., $10\text{Gbps}$).
* **Engine Settings**: Specific properties (e.g., thread pool sizes for VM, max connections for Postgres, cache eviction policy for Redis).

### 2.2. Metrics Tab (Grafana-style Dashboard)
Renders high-frequency canvas metrics.
* **Gauges**: Radial indicators showing live CPU and Memory saturation.
* **Time-Series Charts**: Multi-line micro-charts showing:
  * **Throughput**: Request rates (QPS) and response codes (2xx, 4xx, 5xx).
  * **Latency**: Multi-percentile latency charts (P50, P95, and P99).
  * **Resource Saturation**: Time-series charts representing thread utilization, DB locks, and network bandwidth saturation.

### 2.3. Trace Tab (Distributed Tracing Viewer)
Allows inspection of request paths (similar to Jaeger/Zipkin).
* Displays a list of recent requests passing through the selected component.
* Selecting a trace displays a **Gantt Chart** representing the processing pipeline:

```
Gateway (0ms)   ██████████████████████████████████████████ (120ms)
  AuthSvc (5ms)     ██████████ (25ms)
  UserService (35ms)  ████████████████████████ (75ms)
    UserDB (45ms)       ████████ (20ms)
```

### 2.4. Logs Tab (Console Output Emulator)
Emulates stdout/stderr logs from the simulated component.
* Displays a scrollable terminal container using a monospace font (`JetBrains Mono`).
* Logs are prefix-coded:
  * `[INFO]`: System initialization, configuration reload.
  * `[WARN]`: Queue utilization $>80\%$, thread pools approaching limit, cache evictions.
  * `[ERROR]`: Request drop, database connection timeout, circuit breaker open event.
