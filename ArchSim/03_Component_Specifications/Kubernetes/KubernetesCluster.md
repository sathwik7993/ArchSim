# Component Specification: Kubernetes Cluster

This document outlines the properties, Control Plane scheduling mechanics, Pod lifecycle configurations, and Service mesh routing rules modeled for Kubernetes components.

---

## 1. Kubernetes Structures & Settings
* **Node Pool Capacity**: Number of physical VM nodes ($1$ to $500$).
* **Pod Limits**: Maximum pods per node (e.g. $110$).
* **Scheduler Algorithm**: `SPREAD` (distributes pods across nodes) or `BIN_PACK` (maximizes node utilization).
* **Ingress Class**: Routing rules mapping hostnames/paths to target Kubernetes Services.

---

## 2. Pod Scheduling & Lifecycle Logic

### 2.1. Scheduling Delays (`kube-scheduler`)
When a deployment scales or recovers from a node failure:
1. The scheduler parses CPU and memory resource requests.
2. It assigns the Pod to a node with sufficient capacity.
3. If no nodes have capacity, the Pod enters `PENDING` state and a `RESOURCE_EXHAUSTION` event is logged.

### 2.2. Service Discovery & ClusterIP
* **Kubernetes Service**: Acts as an internal load balancer. It tracks dynamic Pod IP addresses.
* **Probes**: Pods run `livenessProbe` and `readinessProbe` checks.
* **Failover**: If a Pod readiness probe fails:
  * The Service endpoint controller immediately removes the Pod from the routing list.
  * Traffic routing bypasses the failing pod within $100\text{ms}$.
  * The Pod deployment controller schedules a restart event.
