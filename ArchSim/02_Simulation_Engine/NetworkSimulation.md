# ArchSim Network Simulation Specification

This document details the mathematical models and simulation algorithms for routing, bandwidth limits, handshake latency, and packet drops.

---

## 1. The Network Latency Equation
When a message travels across a simulated connection link from Node A to Node B, the total network transit latency ($T_{\text{transit}}$) is calculated as:

$$T_{\text{transit}} = T_{\text{propagation}} + T_{\text{transmission}} + T_{\text{queue}} + T_{\text{processing}}$$

### 1.1. Propagation Delay ($T_{\text{propagation}}$)
The time required for a signal to traverse the distance of the connection link. It is a function of the physical distance ($d$ in km) between component regions:
$$T_{\text{propagation}} = \frac{d}{v}$$
Where $v$ is the velocity of light propagation through optical fiber:
$$v \approx 200,000 \text{ km/s} \implies 5 \text{ ms per } 1,000\text{ km}$$

### 1.2. Transmission Delay ($T_{\text{transmission}}$)
The time required to push the request packet's bytes onto the transmission channel, determined by link bandwidth ($B$ in bps) and payload data size ($S$ in bits):
$$T_{\text{transmission}} = \frac{S}{B}$$

---

## 2. Connection Handshake Emulation
Rather than simulating simple message delivery, ArchSim models connection handshakes when establishing a logical session between clients and gateways.

```
Client                                                   Server
  │                                                        │
  ├─────────────── TCP SYN (RTT / 2) ─────────────────────►│
  ◄─────────────── TCP SYN-ACK (RTT / 2) ──────────────────┤  [TCP Handshake: 1 RTT]
  │                                                        │
  ├─────────────── TLS Client Hello (RTT / 2) ────────────►│
  ◄─────────────── TLS Server Hello (RTT / 2) ─────────────┤  [TLS Handshake: 1 RTT]
```

* **TCP Handshake**: Requires $1 \times \text{RTT}$ (Round-Trip Time) delay before application data can be sent.
* **TLS Handshake**: Adds $1 \times \text{RTT}$ (TLS 1.3) or $2 \times \text{RTT}$ (TLS 1.2) connection setup latency.
* **DNS Resolution**: If a domain name is used, a cold DNS lookup adds $+15\text{ms}$ to $+100\text{ms}$ delay depending on configuration. Cached DNS queries are resolved in $0\text{ms}$.

---

## 3. Congestion & Packet Drops
* **Bandwidth Squeezing**: If the current throughput on a link exceeds the configured bandwidth cap:
  $$\text{Throughput} > B \implies \text{Queue Depth } Q_{\text{link}} \text{ grows}$$
* **Queue Drops**: The link buffer has a maximum packet limit. If $Q_{\text{link}} > Q_{\text{limit}}$, incoming packets are dropped.
* **Packet Loss Probability ($P_{\text{loss}}$)**: User configured loss rates force random drops using the deterministic seed PRNG.

### 3.1. Dynamic Retransmission Timeout (RTO) Calculation
Instead of using static timeouts, ArchSim models the **RFC 6298 (Jacobson/Karels)** algorithm to track round-trip variance and dynamically estimate the RTO for every connection channel:

$$\text{SRTT}_{k+1} = (1 - \alpha) \text{SRTT}_k + \alpha \text{RTT}_{k+1}$$
$$\text{RTTVAR}_{k+1} = (1 - \beta) \text{RTTVAR}_k + \beta |\text{SRTT}_k - \text{RTT}_{k+1}|$$
$$\text{RTO} = \max\left(\text{RTO}_{\text{min}}, \text{SRTT} + 4 \times \text{RTTVAR}\right)$$

Where typical constants are:
* $\alpha = 0.125$ ($1/8$), $\beta = 0.25$ ($1/4$).
* $\text{RTO}_{\text{min}} = 100\text{ms}$.
* Initial values before RTT measurements: $\text{SRTT} = 1000\text{ms}$, $\text{RTTVAR} = 500\text{ms}$, yielding initial $\text{RTO} = 3000\text{ms}$.
* For packets that are dropped and require subsequent retransmissions, exponential backoff applies:
  $$\text{RTO}_{\text{backoff}} = 2^n \times \text{RTO}$$

### 3.2. TCP Congestion Control Simulation
Every link path monitors its Congestion Window ($cwnd$) and Slow Start Threshold ($ssthresh$), measured in packets:
* **Slow Start ($cwnd < ssthresh$)**: For every packet acknowledged, the window grows:
  $$cwnd \leftarrow cwnd + 1 \implies \text{Doubles every RTT}$$
* **Congestion Avoidance ($cwnd \ge ssthresh$)**: Window grows linearly:
  $$cwnd \leftarrow cwnd + \frac{1}{cwnd} \implies \text{Increases by 1 packet per RTT}$$
* **Congestion Mitigation**:
  * **Retransmission Timeout (RTO)**: Hard drop.
    $$ssthresh \leftarrow \max\left(2, \frac{cwnd}{2}\right), \quad cwnd \leftarrow 1$$
  * **Triple Duplicate ACKs**: Fast recovery trigger.
    $$ssthresh \leftarrow \max\left(2, \frac{cwnd}{2}\right), \quad cwnd \leftarrow ssthresh + 3$$

* **Network Partition**: When a partition is triggered, the routing table deletes connection paths between nodes. Requests hitting the partition immediately fail with `Host Unreachable / Connection Timeout` errors.
