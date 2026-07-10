# Component Specification: Kubernetes Pod

This document details the configuration properties, container allocations, probe behaviors, and lifecycle state machines for Kubernetes Pod components.

---

## 1. Configuration Fields
* **Memory Request/Limit**: Memory reservations and hard limits (MB).
* **CPU Request/Limit**: CPU core allocations (e.g. $0.5$ cores request, $2.0$ cores limit).
* **Liveness Probe**: HTTP path or command checks to test if container requires a restart.
* **Readiness Probe**: Checks to test if container can handle incoming traffic requests.
* **Restart Policy**: `Always`, `OnFailure`, or `Never`.

---

## 2. Runtime State Variables
* **Pod Phase**: `Pending`, `Running`, `Succeeded`, `Failed`, `Unknown`.
* **Restart Count**: Number of times the pod has restarted due to failure.
* **CPU Throttle Time**: CPU cycles delayed due to hitting core limits.

---

## 3. Failure Modes
* **OOMKilled**: If memory usage exceeds the configured Limit, the host kernel crashes the pod, logging `Exit Code 137`.
* **CrashLoopBackOff**: If container initialization errors persist, the scheduler delays consecutive restart loops exponentially.

---

## 4. Simulation Logic
1. **Startup**: Pod starts in `Pending` state while waiting for node scheduling checks.
2. **Execution**: Transitions to `Running`. CPU usage scales against container demands. If CPU usage > CPU Limit, the hypervisor throttles compute cycles.
3. **Probe Scraping**: The Kubelet node agent runs periodic liveness and readiness checks:
   * If liveness check fails $N$ times:
     * Restarts container, incrementing the restart counter.
   * If readiness check fails:
     * Service endpoints table unregisters the Pod IP.
