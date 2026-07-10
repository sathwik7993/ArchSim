# Component Specification: API Gateway

This document details the configuration properties, routing rules, rate limit integrations, and visual rendering specifications for API Gateway components.

---

## 1. Configuration Fields
* **Routing Table**: Map of URL path prefix patterns to downstream services (e.g., `/api/v1/users/*` -> `UserService`).
* **Authentication**: Checkbox to toggle authentication validation (HMAC, JWT, or Remote OAuth).
* **Rate Limiting**: Choice of algorithm (`TOKEN_BUCKET`, `SLIDING_WINDOW_COUNTER`) and limits (requests/second).
* **Timeout Settings**: Connection and read timeouts (default: $5,000\text{ms}$).
* **Max Payload Size**: Limit in bytes for incoming request bodies.

---

## 2. Runtime State Variables
* **Active Connections**: Active HTTP connection sockets.
* **Routing Requests**: Instantaneous rate of routed requests per second.
* **Failed Requests Count**: Total requests returning $4xx$ or $5xx$ status codes.
* **Queue Saturation**: Ratio of current queue size to the Gateway's internal buffer limit.

---

## 3. Failure Modes
* **Timeout Exhaustion**: If downstream services respond slowly, Gateway thread allocations are consumed, causing incoming requests to be dropped with `504 Gateway Timeout` codes.
* **Route Hijack / Outage**: If a target service goes offline and no fallback route is configured, the Gateway returns `502 Bad Gateway` immediately.

---

## 4. Simulation Logic
When an incoming packet strikes the API Gateway:
1. **WAF & Auth Inspection**: The Gateway evaluates safety rules and JWT signature verification.
2. **Rate Limit check**: The rate limiter evaluates token availability:
   * If limited, returns `HTTP 429`.
3. **Route Lookup**: Compares request path against routing rules.
4. **Thread Reservation**: Attempts to assign an execution thread slot.
   * If thread pool is full, queues the request.
   * If the queue reaches capacity, drops the request (returning `HTTP 503`).
5. **Downstream Dispatch**: Schedules an event forwarding the request over the target connector link.

---

## 5. Visual Representation
* **Icon**: Firewall/Shield layered with routing arrows.
* **Colors**: Deep teal card border when active.
* **Metrics Overlay**: Radial gauges showing active connection pool depth and live throughput metrics.
