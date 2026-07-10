# Component Specification: DNS Server (Domain Name System)

This document details the configuration parameters, caching behaviors, and latency models for simulated DNS Name Resolution servers.

---

## 1. Configuration Fields
* **Zone Records**: Domain-to-IP binding configurations (e.g. `api.archsim.io` -> `10.0.5.2`).
* **TTL (Time to Live)**: Duration (in seconds) that records remain cached at the client cache level.
* **DNS Latency Penalty**: Base lookup time for resolving recursive queries ($15\text{ms}$ to $100\text{ms}$).

---

## 2. Runtime State Variables
* **Query Rate**: Inbound queries per second (QPS).
* **Cache Hits**: Number of queries resolved at client cache level without contacting the DNS server.
* **Resolution Failures**: Queries requesting non-existent records.

---

## 3. Failure Modes
* **DNS Outage**: The DNS server crashes. If clients attempt a lookup on non-cached records, queries fail with `Name Not Resolved` error codes, causing connections to fail.

---

## 4. Simulation Logic
When a client sends a request to a hostname (e.g. `api.archsim.io`):
1. **Client DNS Cache Check**: The client checks its local cache.
   * If record is found and $T_{\text{now}} - T_{\text{resolved}} < \text{TTL}$:
     * Latency increment is $0\text{ms}$.
   * Else, client schedules a `DNS_QUERY` event targeting the DNS server node.
2. **Server Lookup**: The DNS server receives the query:
   * Adds the configured base lookup latency penalty.
   * Updates the client cache with the record and timestamp.
   * Schedules a return routing event to the client with the IP details.
3. **Application Phase**: Client uses the returned IP to perform TCP handshakes.
