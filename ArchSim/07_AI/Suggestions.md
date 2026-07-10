# AI Suggestions Engine Specification

This document details the logic and heuristic models for providing real-time configuration suggestions based on active simulation statistics.

---

## 1. Metric-Driven Recommendations
While the simulation runs, the Suggestions Engine monitors metric streams to generate recommendations:

| Metric Trigger | Problem Identified | AI Recommendation |
| :--- | :--- | :--- |
| `P99 Latency > 2s` AND `Queue Depth > 90%` | Node Thread Pool Saturated | Increase instances replica count or thread pool limits. |
| `Cache Hit Rate < 20%` AND `Eviction Count > 100/s` | Cache size too small | Increase Max Memory configuration or change eviction policy to LRU. |
| `DB Write Latency > 500ms` AND `Disk IOPS > 95%` | Storage I/O bottleneck | Upgrade storage to SSD or provision higher IOPS. |
| `Consumer Lag growing` | Kafka Consumer Bottleneck | Increase consumer replicas or adjust message processing timeouts. |

---

## 2. Interactive Recommendation Cards (UI)
Suggestions are displayed in the Inspector sidebar as action cards:
* **Problem Summary**: A clear explanation of the bottleneck (e.g. "PostgreSQL CPU bound").
* **Proposed Solution**: Recommended parameters (e.g. "Enable Read Replicas for SELECT queries").
* **Apply Button**: Clicking "Apply Recommendation" immediately updates the component's configuration on the canvas without pausing the simulation clock.
