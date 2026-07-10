# Component Specification: Serverless Function (Compute)

This document details the configuration parameters, execution lifecycles, and cold start delays modeled for Serverless Functions (AWS Lambda).

---

## 1. Configuration Fields
* **Memory Size**: Allocation sizing ($128\text{ MB}$ to $10,240\text{ MB}$).
* **Execution Timeout Limit**: Hard limits on continuous compute cycles (default: $15\text{s}$, max: $900\text{s}$).
* **Provisioned Concurrency**: Minimum active runtime slots kept warm in memory.
* **VPC Integration**: Toggle to routing function traffic inside the private cluster.

---

## 2. Runtime State Variables
* **Active Invocation Instances**: Number of concurrent executions.
* **Cold Starts Rate**: Percentages of triggers creating new virtual env spins.
* **Execution Time (ms)**: Live processing latency.

---

## 3. Failure Modes
* **Function Timeout**: Terminated with `HTTP 504` if execution duration exceeds configured limit.
* **Concurrent Limit Throttling**: Triggers `HTTP 429 Too Many Requests` if queries exceed total concurrency pools limit.

---

## 4. Simulation Logic
1. **Cold Start check**: When an invocation triggers:
   * If an idle warm instance is available:
     * Latency increment is $0\text{ms}$.
   * Else, if total concurrency < Limit:
     * Adds cold start setup delay:
       $$T_{\text{cold}} = T_{\text{alloc}} + T_{\text{runtime\_init}} \approx 100\text{ms} - 3000\text{ms}$$
       VPC integration adds $+1000\text{ms}$ interface attachment delay.
   * Else (limit reached):
     * Returns `HTTP 429`.
2. **CPU Execution cost**: Execution latency scales inversely with memory:
   $$\text{Allocated Cores} = \frac{\text{Memory MB}}{1760\text{ MB}}$$
   $$T_{\text{execution}} = \frac{C_r}{\text{Allocated Cores} \times F}$$
3. **Shutdown Delay**: Active containers enter idle warm states for $10\text{ virtual minutes}$ before reclamation.
