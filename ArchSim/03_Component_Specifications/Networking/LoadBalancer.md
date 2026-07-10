# Component Specification: Load Balancer (Networking)

This document details the configuration parameters, health checking rules, and load distribution routing algorithms modeled for Load Balancers.

---

## 1. Configuration Options
* **Balancing Mode**: Layer 4 (TCP packet routing) or Layer 7 (HTTP path-based routing).
* **Distribution Algorithm**:
  * `ROUND_ROBIN`: Sequential distribution of traffic.
  * `LEAST_CONNECTIONS`: Selects the backend replica with the fewest active connection allocations.
  * `IP_HASH`: Sticky session mapping based on source IP client hashes.
* **Health Check Configurations**:
  * **Path**: e.g., `/healthz`.
  * **Interval**: Periodicity of health checks ($5\text{s}$ to $60\text{s}$).
  * **Healthy Threshold**: Consecutive successes needed to mark a failed node as healthy.
  * **Unhealthy Threshold**: Consecutive failures needed to mark a healthy node as failed.

---

## 2. Load Balancer Simulation Logic
* **Draining Time**: When a backend VM is removed (or auto-scaled down), the Load Balancer enters "connection draining" mode, preventing new routing allocations while allowing active connections to complete within a timeout window ($30\text{ seconds}$).
* **Health Check Probe Overhead**: Probing backend endpoints consumes a small amount of downstream thread capacity. If backend services are fully saturated, they may fail health check probes, triggering cascading load balancer node removals.
* **Routing Delay ($T_{\text{lb}}$)**: Overhead introduced by processing request headers:
  * Layer 4 routing: $+0.2\text{ms}$ delay.
  * Layer 7 routing (requires header parsing/matching): $+2.5\text{ms}$ delay.
