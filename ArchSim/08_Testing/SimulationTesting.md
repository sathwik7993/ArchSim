# Simulation Testing Specification

This document details the strategies and assertions used to test the correctness of simulated system behaviors.

---

## 1. Deterministic System Testing
Because the simulation engine is seed-based and deterministic, we test system design behaviors by asserting precise metrics curves and timestamps.

### 1.1. Integration Behavior Assertions
We write integration tests that run micro-simulations and assert specific behavioral outcomes:

#### Circuit Breaker Validation
* **Scenario**: Load test against a service that queries a failing database.
* **Assertion**: Verify the circuit transitions from `CLOSED` to `OPEN` within $2\text{ virtual seconds}$ of error rates exceeding the $50\%$ threshold, and verify that subsequent calls fail-fast immediately (returning the fallback value).

#### Autoscaler Load Response
* **Scenario**: 100 QPS spike targeting a single compute replica VM with autoscaler enabled.
* **Assertion**: Verify that a new VM provisioning process is scheduled at $T = 10.0\text{s}$, and verify that replica count increases to $2$ after a boot delay of $10\text{ virtual seconds}$.

---

## 2. Chaos Engineering Assertions
* Tests simulate inject commands (e.g., cutting database connection links) and assert that:
  * Traffic failover protocols route reads successfully to replicas.
  * System write operations recover automatically once connection links are marked healthy.
  * No thread leakage occurs during the degraded execution window.
