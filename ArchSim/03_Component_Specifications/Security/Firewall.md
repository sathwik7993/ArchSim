# Component Specification: Firewall

This document details the rule matching logic, network port configurations, and bandwidth overhead limits for simulated Firewalls.

---

## 1. Configuration Fields
* **Ingress / Egress Rule List**: Port, IP range, and actions (e.g. `Allow TCP 80 from 0.0.0.0/0`, `Deny All from 10.0.5.0/24`).
* **Rule Engine Mode**: Statefully inspected (keeps track of established connections) or Stateless packet matching.
* **Inspection Depth**: Deep packet search (slow) vs Header check (fast).

---

## 2. Runtime State Variables
* **Blocked IP Log**: List of source IPs blocked by Firewall rules.
* **Inspect CPU Overhead**: Percentages of CPU cycles spent comparing headers.

---

## 3. Failure Modes
* **Port Exhaustion**: Under stateful inspection, TCP connection state tables can fill up during DDoS attacks, dropping packets for healthy users.

---

## 4. Simulation Logic
When a network packet hits the Firewall:
1. **Stateless Check**: The rules engine compares port, protocol, and IP address.
   * If a matching `Deny` rule is found, the packet is deleted. A `Connection Reset` or timeout event is returned.
2. **Stateful Check**: Looks up the connection signature in the active state table.
   * If entry exists, bypasses detailed rule checks (processing in $0.05\text{ms}$).
   * If new, performs rules list search (inspect delay matches rule count).
3. **Queue Saturation**: If state table reaches limits, packets drop randomly.
