# AI Interview Mode Specification

This document details the interview challenge structures, automated architecture scoring engines, and evaluation templates for ArchSim's system design mock challenges.

---

## 1. Challenge Template Schema
Each system design challenge is configured as a JSON template defining the problem constraints, expected target volume, latency SLA boundaries, and budget limits.

```json
{
  "challengeId": "ch-youtube-0",
  "title": "Design YouTube Video Transcoding & Delivery",
  "trafficRequirement": {
    "peakUploadQps": 50,
    "peakViewQps": 10000
  },
  "sla": {
    "maxP99LatencyMs": 300,
    "minAvailabilityPct": 99.95
  },
  "budgetLimitUsd": 5000,
  "scoringWeights": {
    "latency": 0.3,
    "availability": 0.3,
    "cost": 0.2,
    "maintainability": 0.2
  }
}
```

---

## 2. Automated Scoring Engine

### 2.1. Traffic Execution Phase
When a user submits their architecture for evaluation:
1. The simulator initializes the canvas layout on the backend.
2. It runs a **stress-test load simulation** (e.g., 5 virtual minutes) applying the required peak traffic profiles.
3. The engine logs metrics for average latency, failed requests, and peak resource consumption.

### 2.2. Scoring Formula
The system design score ($S$) is calculated out of 100:

$$S = W_l \cdot S_{\text{latency}} + W_a \cdot S_{\text{availability}} + W_c \cdot S_{\text{cost}} + W_m \cdot S_{\text{maintainability}}$$

Where:
* **$S_{\text{latency}}$**: Evaluated based on P99 latency relative to target SLAs.
* **$S_{\text{availability}}$**: $\frac{\text{Successful Requests}}{\text{Total Requests}} \times 100$.
* **$S_{\text{cost}}$**: Calculated from component resource sizes (VM cores, SSD size, DB types). Exceeding budget yields $0$ score.
* **$S_{\text{maintainability}}$**: Computed using AI Analyzer heuristic checks (number of components, node redundancies, single points of failure).
