# Component Specification: Redis Cache

This document details the configuration parameters, cache eviction rules, hit/miss probabilities, and memory constraints for the simulated Redis cache node.

---

## 1. Parameters
* **Max Memory**: Hard allocation limit (e.g. $2\text{ GB}$).
* **Eviction Policy**:
  * `NO_EVICTION`: Returns out-of-memory errors when full.
  * `ALLKEYS_LRU`: Least Recently Used keys are evicted when memory limits are reached.
  * `ALLKEYS_LFU`: Least Frequently Used keys are evicted.
  * `VOLATILE_TTL`: Evicts keys with the shortest Time-to-Live settings.
* **Hit Ratio Probability**: Base target hit rate configured by the user ($0\%$ to $100\%$).

---

## 2. Simulation Mechanics

### 2.1. Caching Latency ($T_{\text{cache}}$)
Redis is simulated as an in-memory single-threaded process. 
$$T_{\text{cache}} = T_{\text{networking}} + T_{\text{read\_write\_overhead}}$$
Where $T_{\text{read\_write\_overhead}} \approx 0.1\text{ms}$. If connections exceed 10,000, context switching overhead increments this delay.

### 2.2. Cache Eviction Storm
If memory usage hits $100\%$:
* If `NO_EVICTION` is active, write operations fail with `OOM Command Not Allowed`.
* If an eviction policy is active, the node purges old keys. This triggers CPU execution spikes due to search operations, increasing cache read-latency.

### 2.3. Hit / Miss Processing Flow
When a read request arrives:
1. The simulator checks the cache hit probability.
2. **Hit**: The request completes immediately, returning cache data.
3. **Miss**: The cache returns empty. The request is forwarded to the database, and a write event is scheduled to insert the fetched data back into the cache.
