# ArchSim Persistence Specification

This document details the serialization formats, export/import interfaces, and data versioning models used in ArchSim to save and restore architectures.

---

## 1. Document Serialization Formats

### 1.1. Native ArchSim Schema (JSON)
ArchSim projects are persisted in a custom JSON format that captures visual layout and simulation properties.
```json
{
  "schemaVersion": 1,
  "projectId": "proj-9812-ad98",
  "canvas": {
    "viewport": { "zoom": 1.0, "x": 100, "y": -50 },
    "nodes": [
      {
        "id": "node-redis-0",
        "type": "REDIS",
        "label": "Session Cache",
        "position": { "x": 200, "y": 300 },
        "config": {
          "maxMemoryMb": 1024,
          "evictionPolicy": "ALLKEYS_LRU",
          "persistence": "NONE"
        }
      }
    ],
    "links": [
      {
        "id": "link-0",
        "source": "node-gw",
        "target": "node-redis-0",
        "config": {
          "bandwidthGbps": 5.0,
          "latencyMs": 1.5,
          "packetLossRate": 0.0
        }
      }
    ]
  }
}
```

---

## 2. Infrastructure as Code (IaC) Exports
To enhance real-world utility, ArchSim designs can be exported to standard DevOps definitions:
* **Terraform Export**: Translates visual components into AWS or Kubernetes provider blocks. For example, a VirtualMachine node exports as an `aws_instance` block, and a PostgreSQL node exports as an `aws_db_instance`.
* **Kubernetes Manifest Export**: Compiles visual configurations (Compute, LoadBalancer, Ingress) into standard Kubernetes YAML manifests containing `Deployment`, `Service`, and `Ingress` declarations.

---

## 3. Version Control & History Snapshots
* **Project Commits**: ArchSim supports committing canvas designs. Each commit saves a snapshot of the canvas configuration state in the database, allowing users to restore previous architectural versions.
* **Database Storage**: Snapshots are delta-compressed on the server to prevent bloated Postgres table growth. Only modifications are stored in the historical logs.
* **Replay Export**: Users can export full simulation runs as flat binary files containing the event database records to replay the execution timeline offline.
