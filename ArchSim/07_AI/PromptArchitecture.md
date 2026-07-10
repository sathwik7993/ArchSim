# AI Prompt Architecture Specification

This document details the structured system prompt templates, context formatting rules, and schema definitions used to call LLMs for architectural validation and feedback.

---

## 1. Context Assembly Strategy
When sending an architecture layout to the LLM for analysis, the backend compiles a structured payload containing:
* **System Graph**: List of nodes (id, type, config) and edges (source, target, latency, bandwidth).
* **Execution Summary**: Aggregated metrics from the latest simulation run (QPS, error rates, CPU/RAM utilization, thread/queue depths).
* **Challenge Context**: Target metrics and SLAs if running in Interview Mode.

---

## 2. LLM System Prompt Template

```markdown
You are an expert Principal Distributed Systems Architect. Your task is to analyze the following system design schema and simulation logs, identify bottlenecks or vulnerabilities, and suggest concrete fixes.

### JSON System Schema
[INSERT SYSTEM GRAPH JSON]

### Simulation Run Metrics
[INSERT METRICS JSON]

### Output Format Rules
You must return a valid JSON object matching the following structure. Do not include markdown code block syntax (like ```json) or explanation outside the JSON:
{
  "summary": "High-level summary of system performance.",
  "issues": [
    {
      "componentId": "ID of node causing issue",
      "severity": "CRITICAL" | "WARNING" | "INFO",
      "category": "BOTTLENECK" | "SPOF" | "REDUNDANCY" | "COST",
      "description": "Clear explanation of what is failing and why.",
      "fix": "Actionable instructions to resolve this configuration issue."
    }
  ]
}
```

---

## 3. JSON Output Validation Schema
To prevent parser errors:
* Responses are checked against a strict JSON Schema definition before processing.
* If JSON validation fails or the model returns non-conforming structures, the backend triggers a retry with a corrective prompt highlighting the validation errors.
