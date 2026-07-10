# Load Testing Specification

This document details the backend and WebSocket load testing protocols, configurations, and target throughput limits.

---

## 1. Test Tools & Infrastructure
* **Tool**: **k6** or **Gatling** is used to write load scripts.
* **Infrastructure**: Load tests are executed from distributed agents targeting a dedicated staging environment (mirroring production specifications).

---

## 2. Test Targets & Profiles

### 2.1. API Server Limits
* **Load Profile**: Linear ramp-up from $0$ to $5,000$ concurrent virtual users over $5\text{ minutes}$.
* **Target Latency SLAs**:
  * P50: $< 50\text{ms}$ for project saves.
  * P99: $< 250\text{ms}$ under peak concurrent load.
* **Max Error Rate**: $< 0.1\%$ under normal operation.

### 2.2. WebSocket Concurrent Connection Limits
* **Scenario**: Open $20,000$ concurrent WebSocket sessions. Each session receives metrics packages at a rate of 10Hz.
* **Metrics Targets**:
  * Verify WebSocket container RAM remains $< 4\text{ GB}$.
  * Confirm average metrics dispatch latency is $< 100\text{ms}$.
  * Ensure no frame drops occur under peak broadcast volume.
