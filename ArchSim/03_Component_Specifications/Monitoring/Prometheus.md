# Component Specification: Prometheus

This document details the scrape targets, TSDB ingestion limits, and PromQL execution rules for simulated Prometheus instances.

---

## 1. Configuration Fields
* **Scrape Targets List**: IPs/service endpoints to poll for metrics.
* **Scrape Frequency**: Interval in seconds between target polling ($5\text{s} - 60\text{s}$).
* **Retention Bytes Limit**: Max size of TSDB storage on disk before compressing.
* **Scrape Timeout**: Maximum wait duration for target reply metrics (default: $10\text{s}$).

---

## 2. Runtime State Variables
* **Scrape Success Ratio**: Percentage of target polls that resolve successfully.
* **TSDB Ingestion Rate**: Metrics samples written per second to disk.
* **PromQL Evaluation CPU**: Compute load during alert rules checking.

---

## 3. Failure Modes
* **Scrape Timeout Cascades**: If compute instances are overloaded, their metrics endpoints fail to reply in time, leading to gaps in telemetry graphs.
* **TSDB Disk Saturation**: Under long runs or high target counts, metrics database consumes all storage, causing Prometheus to fail.

---

## 4. Simulation Logic
1. **Scrape Loop**: Evaluates targets at the scheduled interval.
2. **Target Overhead**: Hits target `/metrics` endpoint, adding CPU calculations on target node.
3. **Write Path**: Commits metric points to TSDB. Calculates storage footprint growth:
   $$\Delta \text{Disk Size} = \text{Target Count} \times \frac{\text{Metrics Per Target}}{\text{Interval}} \times 2\text{ bytes} \times \Delta t$$
4. **Alert Checking**: Evaluates rules expressions. Triggers Alertmanager if criteria are met.
