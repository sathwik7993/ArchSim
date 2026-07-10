# ArchSim Simulation UI Specification

This document details the interface layouts and interactive controls for governing simulation playback, traffic generation, and failure injection.

---

## 1. Simulation Control Panel (Top Header)
The top header provides playback rate controls that coordinate directly with the backend Event Engine scheduler.

```
[Play / Pause]  [Step Frame (1 Tick)]  [Speed Slider: 1x === 10x === 100x]  [Virtual Timestamp: 00:12:45.320]
```

### 1.1. Control States
* **Play**: Resumes event scheduling loop execution.
* **Pause**: Freezes the simulation clock. All state-change tickers, resource consumption updates, and request packet transitions pause.
* **Step Frame**: Executes exactly one discrete event step in the queue and then returns to the paused state.
* **Speed Factor**: A logarithmically scaled slider adjusting the ratio of virtual simulation time to real world wall-clock time:
  $$\text{Speed Ratio} = 10^{\text{Slider Value}}$$

---

## 2. Traffic Generator Panel (Left Sidebar / Drawer)
Allows configuration of target request volumes and connection profiles to test the limits of the system design.

### 2.1. Traffic Profiles Editor

```
+-------------------------------------------------------+
|  Traffic Generator Configuration                      |
|  Profile Type: [ Constant | Burst | Flash Sale | DDoS]|
|  Target QPS: [ 1000 ] / sec                           |
|  Peak Duration: [ 120 ] sec                           |
|  Client Location: [ Global | US-East | EU-West ]      |
|  Network Latency: [ 25ms ] +/- [ 5ms ] Jitter        |
+-------------------------------------------------------+
```

* **Constant Profile**: Steady flow of requests over time.
* **Burst Profile**: Alternates between low base traffic and high spikes at periodic intervals.
* **Flash Sale Profile**: Rapid exponential ramp-up of requests followed by slow logarithmic decay.
* **DDoS Profile**: Extremely high request volume designed to overwhelm network bandwith limits, CPU capacities, or connection pools.

---

## 3. Chaos Engineering / Failure Injection Panel
A floating dashboard (typically collapsed at the bottom-left corner) containing controls to trigger failures on the canvas.

### 3.1. Immediate Actions
* **Kill Node**: Instantly shuts down the selected compute or database node.
* **Partition Network**: User selects two node groups; the simulator cuts all communication pathways between them.
* **Inject Latency**: Adds fixed or variable delays (e.g., $+200\text{ms}$) to the network adapter of a component.
* **OOM Leak**: Forces memory usage of the selected component to grow linearly by $N\text{MB/sec}$ until it crashes.

### 3.2. Scheduled Chaos Events
Users can drag failure blocks onto the bottom visual timeline. For example, "Inject database network partition at Virtual Time 00:05:00, recover at 00:08:00".
