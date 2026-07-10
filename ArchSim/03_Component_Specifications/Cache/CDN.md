# Component Specification: CDN (Content Delivery Network)

This document details the configuration parameters, caching behaviors, and origin routing rules modeled for Content Delivery Networks.

---

## 1. Configuration Fields
* **Edge TTL**: Duration static assets are kept at edge locations.
* **Query String Forwarding**: Toggle to bypass caching for dynamic query URLs.
* **Origin URL**: Target IP/host of the application origin server.
* **Edge Locations Nodes**: Number of simulated globally distributed edges ($10$ to $500$).

---

## 2. Runtime State Variables
* **Edge Cache Hit Rate**: Percentage of requests served from edge cache memory.
* **Origin Requests (QPS)**: Traffic rate forwarded to the origin server.
* **Bandwidth Savings**: Virtual network bytes served from CDN edges rather than origin servers.

---

## 3. Failure Modes
* **Origin Shield Overload**: If a cache invalidation occurs, all client traffic hits the origin server concurrently (thundering herd), causing origin server saturation.

---

## 4. Simulation Logic
When a request is initiated targeting the CDN endpoint:
1. **Routing to Edge**: The simulator routes the request to the closest edge node, calculating short network transit time ($T_{\text{edge}} \approx 5\text{ms} - 15\text{ms}$).
2. **Cache Check**:
   * **Hit (TTL not expired)**: Edge returns the asset immediately, avoiding origin server calls.
   * **Miss (TTL expired)**: Edge forwards the query to the origin gateway over longer network links, caches the returned response, and resolves the client query.
