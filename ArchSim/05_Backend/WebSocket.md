# ArchSim WebSocket Specification

This document details the real-time WebSocket protocol messages, payload formats, and event handling logic used for metrics streaming and canvas editing coordination.

---

## 1. WebSocket Protocol Architecture
* **Endpoint**: `/ws/v1/sessions`
* **Transport Protocol**: WSS (WebSocket Secure) with sub-protocol JSON or Protobuf (optional for high-throughput binary frames).
* **Heartbeat**: Ping/Pong frame interval is set to $25\text{ seconds}$ to keep connections active through ALBs. If a client fails to reply to a Ping within $5\text{ seconds}$, the connection is closed.

---

## 2. Message Formats

### 2.1. Client-to-Server Messages

#### Join Session Room
Sent when opening a project to coordinate multiplayer collaboration.
```json
{
  "action": "JOIN_ROOM",
  "payload": {
    "projectId": "proj-9812-ad98",
    "token": "jwt-auth-token"
  }
}
```

#### Client Mouse Movement (Cursor Share)
Broadcasts live cursor position to other editors.
```json
{
  "action": "CURSOR_MOVE",
  "payload": {
    "x": 420.5,
    "y": 680.12
  }
}
```

---

### 2.2. Server-to-Client Messages

#### Real-time Metrics Broadcast
Dispatched at a frequency of 10Hz ($100\text{ms}$ intervals) during active simulation execution.
```json
{
  "event": "METRICS_UPDATE",
  "timestamp": 1774328400120,
  "payload": {
    "simulationTime": "00:02:14.200",
    "components": [
      {
        "id": "node-user-svc",
        "cpuUsage": 56.4,
        "ramUsageMb": 1024,
        "activeConnections": 15,
        "qps": 850,
        "queueDepth": 12
      },
      {
        "id": "node-user-db",
        "cpuUsage": 24.1,
        "ramUsageMb": 2048,
        "activeConnections": 8,
        "qps": 425,
        "queueDepth": 0
      }
    ]
  }
}
```

#### Alert Dispatch
Fired immediately when a component boundary or state transitions.
```json
{
  "event": "ALERT_TRIGGERED",
  "timestamp": 1774328400130,
  "payload": {
    "componentId": "node-user-svc",
    "alertType": "THREAD_POOL_SATURATED",
    "message": "Thread pool reached limit (100/100). Incoming requests are queuing up.",
    "severity": "WARNING"
  }
}
```
# 3. Connection Fault Tolerance
* **Reconnection Strategy**: Expontential backoff connection retries ($1\text{s}, 2\text{s}, 4\text{s}, 8\text{s}, \dots$ up to a maximum of $30\text{s}$).
* **State Resync**: On reconnection, the client requests a complete snapshot update (`GET_STATE`) before processing incremental socket packets.
