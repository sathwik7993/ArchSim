# ArchSim Autoscaling Simulation Specification

This document details the reactive and threshold-based autoscaling algorithms used to scale compute node replica sizes dynamically.

---

## 1. Autoscaling Core Loops & Trigger Rules
Autoscaling components periodically evaluate metrics (e.g. CPU, RAM, or Queue Depth) at fixed intervals ($T_{\text{evaluation}} = 10\text{s}$).

```
[Simulation Metrics] ──► [Evaluation Loop] (Every 10s)
                               │
            ┌──────────────────┴──────────────────┐
            ▼ (Metric > Upper Threshold)          ▼ (Metric < Lower Threshold)
      [Scale Up Trigger]                     [Scale Down Trigger]
            │                                     │
    (Check Cool Down)                     (Check Cool Down)
            │                                     │
            ▼                                     ▼
     Add 1 VM Instance                     Remove 1 VM Instance
```

### 1.1. Target Tracking Scaling Algorithm
The autoscaler calculates the desired replica count ($R_{\text{target}}$) to maintain a target metric utilization level ($U_{\text{target}}$):

$$R_{\text{target}} = \left\lceil R_{\text{current}} \times \frac{U_{\text{current}}}{U_{\text{target}}} \right\rceil$$

Where:
* $R_{\text{current}}$ is the current number of active VM/pod replicas.
* $U_{\text{current}}$ is the average CPU utilization across all active replicas.

---

## 2. Constraints & Fail-safes

### 2.1. Scale-Up and Scale-Down Cooldowns
To prevent **Throttling/Flapping** (repeatedly scaling instances up and down in rapid succession due to minor fluctuations):
* **Scale-up Cooldown**: After scaling up, the cluster locks further scaling actions for $60\text{ seconds}$ (virtual time) to allow new instances to complete boot-up sequences.
* **Scale-down Cooldown**: Locks scale-down actions for $300\text{ seconds}$ after a cluster change.

### 2.2. Replica Limits
Users set hard bounds:
$$\text{Min Replicas} \le R \le \text{Max Replicas}$$

---

## 3. Instance Boot Latency Emulation
New compute nodes do not appear instantly. When scaling occurs, the VM state transitions to `PROVISIONING` and remains unavailable for a configurable boot delay:

$$T_{\text{boot}} = T_{\text{system\_boot}} + T_{\text{app\_initialization}}$$

For typical VM profiles, $T_{\text{boot}} = 10\text{s}$ (light containers) or $90\text{s}$ (heavy VMs). During this delay, the node consumes base memory but cannot process requests, modeling realistic resource lag during traffic spikes.
