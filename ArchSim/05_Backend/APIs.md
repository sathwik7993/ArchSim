# ArchSim Backend REST API Specification

This document details the REST endpoints, payload structures, and response schemas exposed by the ArchSim backend.

---

## 1. Project Management APIs

### 1.1. Create Project
* **Route**: `POST /api/v1/projects`
* **Auth**: Required (JWT Bearer Token)
* **Request Payload**:
  ```json
  {
    "name": "E-Commerce Microservices",
    "description": "High-availability retail system",
    "config": {
      "defaultRegion": "us-east-1"
    }
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "projectId": "proj-9812-ad98",
    "name": "E-Commerce Microservices",
    "createdAt": "2026-07-05T15:30:00Z",
    "version": 1
  }
  ```

### 1.2. Save Canvas Layout
* **Route**: `PUT /api/v1/projects/{projectId}/canvas`
* **Auth**: Required
* **Request Payload**:
  ```json
  {
    "nodes": [
      {
        "id": "node-user-db",
        "type": "POSTGRESQL",
        "position": { "x": 450, "y": 600 },
        "properties": {
          "maxConnections": 100,
          "allocatedMemoryMb": 2048,
          "replicationMode": "ASYNCHRONOUS"
        }
      }
    ],
    "links": [
      {
        "id": "link-1",
        "source": "node-user-svc",
        "target": "node-user-db",
        "properties": {
          "latencyMs": 5,
          "bandwidthGbps": 10
        }
      }
    ]
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "projectId": "proj-9812-ad98",
    "status": "SAVED",
    "updatedAt": "2026-07-05T15:31:12Z"
  }
  ```

---

## 2. Simulation & Execution APIs

### 2.1. Start Simulation Run
* **Route**: `POST /api/v1/simulations/start`
* **Auth**: Required
* **Request Payload**:
  ```json
  {
    "projectId": "proj-9812-ad98",
    "trafficProfile": "FLASH_SALE",
    "durationSeconds": 600,
    "seed": 42
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "simulationId": "sim-4392-aa88",
    "status": "RUNNING",
    "webSocketUrl": "wss://api.archsim.io/sim-stream/sim-4392-aa88"
  }
  ```

### 2.2. Inject Failure Event
* **Route**: `POST /api/v1/simulations/{simulationId}/chaos`
* **Auth**: Required
* **Request Payload**:
  ```json
  {
    "targetComponentId": "node-user-db",
    "failureType": "NETWORK_PARTITION",
    "durationSeconds": 120
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "eventId": "evt-7722-ad00",
    "status": "INJECTED",
    "timestamp": "2026-07-05T15:32:05Z"
  }
  ```

---

## 3. Extended Project & Simulation APIs

### 3.1. List Projects
* **Route**: `GET /api/v1/projects`
* **Auth**: Required
* **Response (200 OK)**:
  ```json
  [
    {
      "projectId": "proj-9812-ad98",
      "name": "E-Commerce Microservices",
      "description": "High-availability retail system",
      "createdAt": "2026-07-05T15:30:00Z",
      "version": 1
    }
  ]
  ```

### 3.2. Delete Project
* **Route**: `DELETE /api/v1/projects/{projectId}`
* **Auth**: Required
* **Response (204 No Content)**: Empty body.

### 3.3. Get Project Canvas Layout
* **Route**: `GET /api/v1/projects/{projectId}/canvas`
* **Auth**: Required
* **Response (200 OK)**: Same payload format as `PUT /api/v1/projects/{projectId}/canvas`.

### 3.4. Stop Simulation Run
* **Route**: `POST /api/v1/simulations/{simulationId}/stop`
* **Auth**: Required
* **Response (200 OK)**:
  ```json
  {
    "simulationId": "sim-4392-aa88",
    "status": "COMPLETED",
    "endedAt": "2026-07-05T15:34:00Z"
  }
  ```

### 3.5. Get Historical Telemetry Metrics
* **Route**: `GET /api/v1/simulations/{simulationId}/metrics`
* **Auth**: Required
* **Query Parameters**:
  * `componentId`: e.g. `node-user-db`
  * `metricName`: `cpu` | `memory` | `qps` | `latency`
  * `resolution`: `1s` | `1m` | `1h`
* **Response (200 OK)**:
  ```json
  {
    "simulationId": "sim-4392-aa88",
    "componentId": "node-user-db",
    "metric": "cpu",
    "timestamps": [1774328400000, 1774328460000],
    "values": [24.1, 28.5]
  }
  ```

