# Component Specification: Kubernetes Service

This document details the configuration parameters, endpoint routing networks, and load distribution mechanics for Kubernetes Services.

---

## 1. Configuration Fields
* **Service Type**:
  * `ClusterIP`: Exposes the service on a cluster-internal IP (default).
  * `NodePort`: Exposes the service on each Node's IP at a static port ($30000 - 32767$).
  * `LoadBalancer`: Provisions an external cloud load balancer targeting the NodePort.
* **Target Port**: Destination port mapped to container sockets.
* **Routing Strategy**: `RoundRobin` or `SessionAffinity`.

---

## 2. Runtime State Variables
* **Active Endpoints Count**: Number of healthy Pods currently registered in the endpoints list.
* **Network Throughput**: Inbound and outbound traffic bytes/sec.

---

## 3. Failure Modes
* **No Endpoints Exception**: If all backing Pods fail readiness probes, the endpoints list is cleared, and routing requests return `503 Service Unavailable` immediately.

---

## 4. Simulation Logic
When traffic hits a Kubernetes Service:
1. **Endpoint Resolution**: The Service queries its active endpoints list.
2. **Path Selection**:
   * If endpoints list is empty, returns `HTTP 503`.
   * Else, selects a target Pod using the configured routing strategy.
3. **Link Transit**: Schedules a network packet transit event targeting the selected Pod IP connection.
