# ArchSim — Project Architecture & Implementation Specification

ArchSim is an interactive distributed systems simulation workbench that transforms static system architecture diagrams into dynamic, stateful, and executable models. This document details the product design, component catalog, UI/UX design system, interactive mechanics, simulation engine architecture, and implementation details for the workbench.

> **Implementation status.** ArchSim is a running full-stack application: a React + TypeScript + Vite frontend and a Java 17 + Spring Boot backend (Postgres + Redis), runnable with a single `docker compose up`. The interactive simulation, component mechanics (Milestone 3), and interactive diagnostics — time-stepped playback, chaos injection, and distributed tracing (Milestone 4) — are implemented client-side. Sections below reflect the built system; the original skeuomorphic UI concept was superseded by the modern dark workbench described in §3.

---

## 1. Product Vision & Principles

The core objective of ArchSim is **"Design → Simulate → Validate"**. Traditional architecture diagramming tools (like Visio or diagrams.net) create static, visual layouts where connections act as passive arrows and nodes lack physical behavior. ArchSim is built on the following fundamental principles:

1. **Stateful Telemetry**: Every component on the canvas is a live runtime object tracking metrics (CPU usage, memory allocation, active connection thread pools, queue saturation, and query-per-second rates).
2. **Resource Consumption**: Execution consumes virtual hardware resources. VMs, Serverless lambdas, Databases, and Disks possess limits. When connections or queries spike, queues accumulate, latency rises exponentially, and components throttle or fail.
3. **Realistic Network Modeling**: Data transmission is bound by physical networking. Requests experience propagation delays, TLS handshake round-trip times (RTT), bandwidth constraints, congestion windows, and packet drop distributions.
4. **Chaos Engineering by Default**: System failures (node crashes, packet drops, CPU locks, memory leaks, and network partitions) are first-class simulation events.
5. **Deterministic Playback**: The execution relies on a discrete event simulation (DES) engine with a synchronized virtual timeline and reproducible seed variables, allowing draftsmen to step, scrub, pause, and replay events.

---

## 2. Dynamic Component Catalog

ArchSim defines **34 component types** organized into **10 functional categories**. Each component is initialized with category-specific visual attributes and customizable performance specifications.

> **Note on icons.** Components render a custom inline **SVG line-icon set** (`src/components/icons.tsx`), tinted with the category accent colour. The emoji glyphs listed per component below are the original conceptual references.

### 2.1 COMPUTE
Compute resources process request loads and host runtime code containers.
- **CLIENT**
  - *Icon*: `💻` | *Color Accent*: Forest Green (`#4a7c59`)
  - *Key Configs*: `qps` (default 100), `protocol` (HTTPS/HTTP), `timeout_ms` (5000ms).
  - *Role*: Simulates client ingress loads, generating traffic loops.
- **SERVER**
  - *Icon*: `🖥`
  - *Key Configs*: `cpu_cores` (4), `memory_gb` (16), `os` (Linux), `auto_scaling` (boolean).
  - *Role*: Handles applications, consumes CPU cycles proportionally to processing time, and simulates garbage collection cycles.
- **CONTAINER**
  - *Icon*: `📦`
  - *Key Configs*: `image` (nginx:latest), `cpu_limit` (2), `memory_limit` (512MB), `replicas` (1).
  - *Role*: Models Kubernetes pods or microservice docker runtimes.
- **LAMBDA**
  - *Icon*: `λ`
  - *Key Configs*: `runtime` (nodejs18.x), `memory_mb` (256), `timeout_seconds` (30), `concurrency_limit` (100).
  - *Role*: Models serverless runtimes. Subject to cold starts (+100ms to +3000ms if unprovisioned).
- **VM**
  - *Icon*: `🖥`
  - *Key Configs*: `instance_type` (t3.medium), `cpu_cores` (2), `memory_gb` (4).
  - *Role*: Models standard virtual machines with connection backlog limits.

### 2.2 NETWORKING
Networking components route traffic, balance loads, resolve names, and enforce traffic rules.
- **API_GATEWAY**
  - *Icon*: `🚪` | *Color Accent*: Navy Blue (`#2e5090`)
  - *Key Configs*: `rate_limit_rps` (1000), `auth_type` (JWT/HMAC/None), `cors_enabled` (boolean).
  - *Role*: Inspects, rate-limits, and forwards client requests to downstream nodes.
- **LOAD_BALANCER**
  - *Icon*: `⚖`
  - *Key Configs*: `algorithm` (round_robin/least_connections/ip_hash), `health_check_interval` (30s), `max_connections` (10000).
  - *Role*: Distributes traffic. Throttles or drops requests when active connection pools exhaust.
- **CDN**
  - *Icon*: `🌐`
  - *Key Configs*: `cache_ttl_seconds` (3600), `edge_locations` (50).
  - *Role*: Edge cache caching origin responses. Evaluates caching hits/misses.
- **DNS**
  - *Icon*: `🔤`
  - *Key Configs*: `ttl` (300), `routing_policy` (simple/geo/failover).
  - *Role*: Resolves domain records adding query latency penances (15ms - 100ms).
- **FIREWALL**
  - *Icon*: `🧱`
  - *Key Configs*: `default_action` (deny/allow), `max_rules` (100).
  - *Role*: Inspects packet headers and drops unauthorized request structures.

### 2.3 STORAGE
Storage hosts persistent files, mounts block volumes, and manages static backups.
- **S3_BUCKET**
  - *Icon*: `🪣` | *Color Accent*: Ochre/Terracotta (`#b86214`)
  - *Key Configs*: `versioning` (boolean), `encryption` (AES-256), `storage_class` (STANDARD/IA/GLACIER).
  - *Role*: Object storage with read-write throughput caps.
- **EBS_VOLUME**
  - *Icon*: `💾`
  - *Key Configs*: `volume_type` (gp3/io2), `size_gb` (100), `iops` (3000).
  - *Role*: Virtual disks attached to servers. Latency is determined by disk seek queue depths.
- **BLOCK_STORAGE**
  - *Icon*: `💿`
  - *Key Configs*: `size_gb` (50), `iops` (1000).
  - *Role*: Raw file system blocks.

### 2.4 DATABASE
Database components provide persistent query processing, transactional indexing, and cluster consensus.
- **POSTGRESQL**
  - *Icon*: `🐘` | *Color Accent*: Plum (`#6c3b75`)
  - *Key Configs*: `version` ("16"), `max_connections` (100), `storage_gb` (100), `replication` (boolean).
  - *Role*: Relational transactional databases with query locking and index scan simulations.
- **MYSQL**
  - *Icon*: `🐬`
  - *Key Configs*: `version` ("8.0"), `max_connections` (100), `storage_gb` (50).
  - *Role*: Standard SQL relational engine.
- **MONGODB**
  - *Icon*: `🍃`
  - *Key Configs*: `version` ("7.0"), `storage_engine` (WiredTiger), `replica_set_members` (3).
  - *Role*: Document-oriented NoSQL engine modeling cluster replications.
- **DYNAMODB**
  - *Icon*: `⚡`
  - *Key Configs*: `read_capacity` (5), `write_capacity` (5), `billing_mode` (PROVISIONED/ON_DEMAND).
  - *Role*: Cloud-native key-value store evaluating throttled reads/writes based on provisioned RCUs/WCUs.
- **CASSANDRA**
  - *Icon*: `👁`
  - *Key Configs*: `replication_factor` (3), `consistency_level` (QUORUM/ONE/ALL), `num_nodes` (3).
  - *Role*: Wide-column store modeling consensus latency and stale write splits.

### 2.5 CACHE
- **REDIS**
  - *Icon*: `🔴` | *Color Accent*: Brick Red (`#c23b22`)
  - *Key Configs*: `maxmemory_mb` (256), `eviction_policy` (allkeys-lru/noeviction), `cluster_mode` (boolean).
  - *Role*: In-memory cache store. Triggers eviction cascades or OOM failures when max memory limit is breached.
- **MEMCACHED**
  - *Icon*: `🧊`
  - *Key Configs*: `memory_mb` (256), `max_connections` (1024), `threads` (4).
  - *Role*: High-throughput cache key buffer.

### 2.6 MESSAGING
- **KAFKA**
  - *Icon*: `📡` | *Color Accent*: Pine/Teal (`#1a6f64`)
  - *Key Configs*: `brokers` (3), `partitions` (12), `replication_factor` (3), `retention_hours` (168).
  - *Role*: Distributed event logs mapping consumer lag.
- **RABBITMQ**
  - *Icon*: `🐰`
  - *Key Configs*: `max_message_size_kb` (128), `vhost` ("/"), `prefetch_count` (10).
  - *Role*: Classic AMQP messaging queue.
- **SQS**
  - *Icon*: `📬`
  - *Key Configs*: `queue_type` (standard/fifo), `visibility_timeout` (30s), `max_receive_count` (3).
  - *Role*: Polled queue simulation modeling visibility timeouts.
- **SNS**
  - *Icon*: `📢`
  - *Key Configs*: `message_filtering` (boolean).
  - *Role*: Publish-subscribe topic fanout.

### 2.7 MONITORING
- **PROMETHEUS**
  - *Icon*: `🔥` | *Color Accent*: Amber (`#b47a16`)
  - *Key Configs*: `scrape_interval` (15s), `retention_days` (15).
  - *Role*: Telemetry scraper processing periodic target polls.
- **GRAFANA**
  - *Icon*: `📈`
  - *Key Configs*: `dashboards` (0), `data_sources` (1).
  - *Role*: Telemetry dashboard visualization.
- **CLOUDWATCH**
  - *Icon*: `👀`
  - *Key Configs*: `log_retention_days` (30).
  - *Role*: Central cloud logger.

### 2.8 SECURITY
- **WAF**
  - *Icon*: `🛡` | *Color Accent*: Dark Crimson (`#78281f`)
  - *Key Configs*: `rate_limit` (2000).
  - *Role*: Web Application Firewall inspecting malicious request patterns.
- **IAM**
  - *Icon*: `🔑`
  - *Key Configs*: `mfa_enabled` (boolean).
  - *Role*: Manages identities and authorization permissions.
- **SECRETS_MANAGER**
  - *Icon*: `🔒`
  - *Key Configs*: `rotation_enabled` (boolean), `rotation_days` (30).
  - *Role*: Simulates rotate schedules and query API overheads.

### 2.9 KUBERNETES
- **K8S_CLUSTER**
  - *Icon*: `☸` | *Color Accent*: Kubernetes Blue (`#2452a0`)
  - *Key Configs*: `version` ("1.28"), `node_count` (3), `cni_plugin` (calico).
  - *Role*: Orchestrates node clusters, resource schedulers, and ingress routing.
- **K8S_DEPLOYMENT**
  - *Icon*: `🚀`
  - *Key Configs*: `replicas` (3), `strategy` (RollingUpdate), `cpu_request` (0.5), `memory_request` (256).
  - *Role*: Pod controller. Scales up/down replicas.
- **K8S_SERVICE**
  - *Icon*: `🔌`
  - *Key Configs*: `type` (ClusterIP/NodePort/LoadBalancer), `port` (80), `target_port` (8080).
  - *Role*: Virtual endpoint balancing traffic internal to the cluster.
- **K8S_INGRESS**
  - *Icon*: `🚏`
  - *Key Configs*: `tls_enabled` (boolean), `path_type` (Prefix).
  - *Role*: Handles ingress paths and maps hosts to backend service targets.

---

## 3. UI/UX Design System

ArchSim uses a modern, dark-first **"technical workbench"** interface (an earlier skeuomorphic paper/blueprint theme was replaced). It is theme-aware: dark is the default, with a light theme toggled from the toolbar and persisted to `localStorage` (applied via `document.documentElement.dataset.theme`, styles in `src/styles.css`).

### 3.1 Design tokens
All colours are CSS custom properties on `:root`, overridden under `:root[data-theme='light']`:
- **Surfaces**: layered `--bg` → `--surface` → `--surface-2/3/4`, separated by hairline `--border`.
- **Text**: `--text`, `--text-dim`, `--text-mute`.
- **Accent**: `--accent` / `--accent-2` (indigo → violet) for primary actions and selection rings.
- **Status**: `--ok`, `--warn`, `--crit` drive saturation colouring across nodes, links, bars, and the trace.
- **Category accents** (`--col-compute`, `--col-networking`, …) tint each component's icon chip and left accent bar.
- **Canvas**: `--canvas-bg` with a two-tier **dot grid** (`--grid-dot` 24px minor, `--grid-dot-major` 120px major) rendered from radial gradients — replacing the old line grid.
- **Fonts**: `Inter` (UI) and `JetBrains Mono` (metrics / mono values).

### 3.2 Iconography
Components render a hand-drawn inline **SVG line-icon set** (`src/components/icons.tsx`, `Icon` / `CategoryIcon`) stroked with `currentColor`, so each icon inherits its category accent.

### 3.3 Nodes, links, and chrome
- **Nodes**: rounded cards with a category-tinted icon chip and a left accent bar; hover lifts them; selection shows an accent ring. During a run a load ring glows green/amber/red and a live CPU chip appears; a downed node greys out with a `DOWN` badge.
- **Links**: cubic-bezier paths (§4.3) that recolour by downstream saturation while simulating, with animated request packets travelling along them.
- **Chrome**: bottom-left zoom controls, bottom-right minimap, bottom-centre playback **timeline**, and a top-centre live **status banner** (peak load, traffic slider, trace toggle, stop).

### 3.4 Interface Layout
The workbench uses a CSS Grid layout — a 58px top bar spanning the width, then three columns:
```
┌────────────────────────────────────────────────────────────────────────┐
│  TOP BAR   ◆ ArchSim        [Undo/Redo] [Theme] [Link] [Save/Analyze/Run]│
├──────────────┬──────────────────────────────────────────┬──────────────┤
│  PALETTE     │  INFINITE DOT-GRID CANVAS                │  INSPECTOR   │
│  (268px)     │        ● SIMULATION LIVE · Traffic ─●─    │  (344px)     │
│  - Search    │  [Card] ═══bezier + packets═══▶ [Card]   │  - Specs     │
│  - Compute   │  - icon chip · ports · load glow          │  - Telemetry │
│  - Network   │                                          │  - Mechanics │
│  - Database  │  [+ − ⊙]     ◀ ▶(play) ──timeline── [map]  │  - Chaos     │
└──────────────┴──────────────────────────────────────────┴──────────────┘
```

---

## 4. Interactive Canvas Mechanics & Mathematics

To make system building intuitive and precise, ArchSim implements interactive coordinates mapping and port mechanics.

### 4.1 Panning and Zooming
The canvas uses CSS transforms applied to a coordinate space:
$$\mathbf{P}_{\text{canvas}} = \frac{\mathbf{P}_{\text{screen}} - \mathbf{T}}{\mathbf{s}}$$

Where:
- $\mathbf{P}_{\text{canvas}}$ is the computed coordinate on the blueprint grid.
- $\mathbf{P}_{\text{screen}}$ is the mouse pointer coordinates relative to the viewport container bounding client rect.
- $\mathbf{T}$ is the current pan offset matrix: $\{x: \text{panX}, y: \text{panY}\}$.
- $\mathbf{s}$ is the current zoom scale multiplier ($0.25 \le \mathbf{s} \le 3.0$).

When zooming on a cursor point $\mathbf{P}_{\text{cursor}}$, the offset adjusts to prevent shifting the element:
$$\mathbf{T}_{\text{new}} = \mathbf{P}_{\text{cursor}} - (\mathbf{P}_{\text{cursor}} - \mathbf{T}_{\text{old}}) \times \frac{\mathbf{s}_{\text{new}}}{\mathbf{s}_{\text{old}}}$$

Wheel/trackpad zoom is **delta-proportional** — the zoom factor is $e^{-\Delta y \cdot k}$ with the delta normalised across `deltaMode` and clamped, and a gentler sensitivity for pinch gestures (`ctrlKey`) — so a trackpad's many small events no longer over-zoom. Panning is triggered by dragging empty canvas (overlay controls stop propagation so they never start a pan).

### 4.2 Port-to-Port Link Creation
- Nodes render input ports at offset $x = -8\text{px}$ and output ports at $x = \text{nodeWidth} + 8\text{px}$.
- Port dragging records the active source node ID.
- During drag, a temporary dashed guideline is rendered from the output port center to the active cursor coordinate:
  $$\text{line} = \{x1: \text{source.x} + \text{width}, y1: \text{source.y} + \frac{\text{height}}{2}, x2: \text{cursor.x}, y2: \text{cursor.y}\}$$
- Releasing the mouse over an input port triggers `addLink(sourceId, targetId)`.
  - The link is rejected if it is a self-loop or duplicate link.

### 4.3 Cubic Bezier Connections
To avoid stiff straight paths, links use cubic bezier curves:
$$\mathbf{C}(t) = (1-t)^3 \mathbf{P}_0 + 3(1-t)^2 t \mathbf{P}_1 + 3(1-t) t^2 \mathbf{P}_2 + t^3 \mathbf{P}_3$$

Where:
- $\mathbf{P}_0 = \{x: \text{source.x} + \text{width}, y: \text{source.y} + \frac{\text{height}}{2}\}$ (Output port)
- $\mathbf{P}_3 = \{x: \text{target.x}, y: \text{target.y} + \frac{\text{height}}{2}\}$ (Input port)
- Control points $\mathbf{P}_1$ and $\mathbf{P}_2$ are offset horizontally based on the distance between ports:
  $$\mathbf{P}_1 = \{x: \mathbf{P}_0.x + \frac{dx}{3}, y: \mathbf{P}_0.y\}$$
  $$\mathbf{P}_2 = \{x: \mathbf{P}_3.x - \frac{dx}{3}, y: \mathbf{P}_3.y\}$$
  Where $dx = |\mathbf{P}_3.x - \mathbf{P}_0.x|$.

---

## 5. Simulation Engine

The interactive simulation runs **entirely client-side** in `src/sim/engine.ts`; the Spring Boot backend mirrors the same model for persisted runs (`SimulationService.java`). It is a deterministic **steady-state flow model**: given a seed and inputs, a run replays identically.

### 5.1 Steady-state flow solver
Traffic originates at `CLIENT` nodes (`qps`). Each frame propagates load across links by iterative relaxation (12 passes):
1. **Inflow** for a node = generated load (clients) + Σ throughput of its incoming links.
2. **Processed** = `min(inflow, capacity)`, split evenly across out-edges.

`nodeCapacity(node)` is derived from each component's configured specs — e.g. `SERVER = cpu_cores × 250`, `POSTGRESQL = max_connections × 22`, `API_GATEWAY = rate_limit_rps`, `DYNAMODB = (read_capacity + write_capacity) × 30`. Per node the model derives:

$$\text{saturation} = \frac{\text{load}}{\text{capacity}}, \quad \text{CPU} = \min(100,\ \text{saturation} \times 100)$$
$$\text{errorRate} = \min\!\left(\frac{\max(0,\ \text{load} - \text{capacity})}{\text{capacity}} \times 0.4,\ 0.35\right)$$

plus `queueDepth` (overflow), `ramUsageMb` (base + saturation-scaled), and forwarded `qps`. Capacity is exceeded ⇒ requests queue and drop.

### 5.2 Cache offload (Milestone 3)
Caches and CDNs forward only their **misses**: `forwardFraction = 1 − hitRate` (`src/sim/components.ts`). Hit rate starts high (Redis ≈ 0.92, CDN ≈ 0.82) and degrades with saturation as evictions climb, so placing a cache in front of a database measurably reduces the downstream load (verified by test — a cache absorbs > 70% of DB reads).

### 5.3 Component mechanics (Milestone 3)
`componentStats(node, metric, sysContext)` produces distinctive, load-driven telemetry for **all 34 types**: cache hit ratio / evictions / memory pressure; DB connection-pool usage, WAL write, lock waits, replication lag; Kafka consumer lag / ISR / throughput; queue backlog & message age; storage IOPS; gateway rate-limit usage & 429s; Lambda cold starts & throttles; k8s pods / replicas ready; etc. Out-of-band observability (Prometheus / Grafana / CloudWatch) scales with a **system context** (total qps, node count) rather than its own inflow.

### 5.4 Time-stepped playback (Milestone 4)
`runSimulationSeries(nodes, links, profile, incidents, config)` produces a deterministic **60-frame** series over virtual time (seeded `mulberry32`). The traffic **profile** shapes load across the run (`STEADY`, `LINEAR` ramp, `BURST` waves), and a **traffic multiplier** (the UI slider, ×0.25–×4) scales client load live. The store drives a play / pause / step / **scrub** timeline; the canvas, inspector, and trace all read the current frame.

### 5.5 Chaos injection (Milestone 4)
Incidents alter the model while active (`Incident` in the engine), injected per node from the inspector and shown as markers on the timeline:
- `CPU_SPIKE` — capacity × 0.3
- `MEMORY_LEAK` — RAM ramps to peak, then capacity × 0.5
- `PACKET_LOSS` — inbound links × 0.5 and an error floor on the target
- `NODE_KILL` — capacity 0, 100% error (node greys out downstream)

### 5.6 Distributed trace (Milestone 4)
`computeTrace(nodes, links, frame)` walks the busiest path from a client, accumulating per-hop **processing latency** (base per type, growing with saturation) plus link **transit latency** (`link.latencyMs`). It renders as a Jaeger-style waterfall that turns amber/red under load, or emits a timeout span on a downed node.

### 5.7 Network geometry
Links are cubic-bezier curves (§4.3); a link's `latencyMs`/`bandwidthGbps` properties feed transit latency in the trace and flow model. Packets are animated along the bezier path via SVG `animateMotion`, their count and speed scaled by the link's throughput.

---

## 6. Frontend State Management

Client state is managed by a Zustand store (`src/state/canvasStore.ts`).

### 6.1 State Schema
- `nodes`, `links`: the canvas graph (component cards + bezier links).
- `selectedNodeId`, `linkMode`, `linkSource`: selection and link-creation state.
- `metrics`, `linkFlows`, `peakSaturation`: telemetry for the current frame.
- `frames`, `currentFrame`, `playing`: time-stepped simulation playback.
- `incidents`: injected chaos events; `showTrace`: trace-panel toggle.
- `trafficLevel`: global load multiplier bound to the traffic slider.
- `theme`: `'dark' | 'light'` (persisted to `localStorage`).
- `history` / `future`: snapshot stacks for undo/redo.

### 6.2 Undo/Redo System
State mutations (adding/moving/deleting nodes, editing properties, creating links) call `pushHistory()`.
- **pushHistory**: Clones the current state of `nodes` and `links`, pushes the clone to the `history` stack, and clears the `future` stack.
- **undo**: Pops the top snapshot from `history`, pushes the current state to the `future` stack, and updates `nodes` and `links`.
- **redo**: Pops the top snapshot from `future`, pushes the current state to `history`, and restores the snapshot.

---

## 7. Build, Run, and Testing

### 7.1 Run the full stack (Docker — one command)
From the repository root:
```bash
docker compose up --build -d      # then open http://localhost:5173
```
This builds and runs four services with health-gated ordering — `postgres`, `redis`, `backend` (Spring Boot, port 8080), and `frontend` (nginx serving the built app and proxying `/api` + `/ws` to the backend). No local `mvn`/`npm` required. See `README.md`.

### 7.2 Local development (optional)
- Frontend: `cd frontend && npm install && npm run dev` (port 5173; proxies `/api` → `localhost:8080`).
- Backend: `docker compose up -d postgres redis` then `cd backend && mvn -o spring-boot:run` (requires `JAVA_HOME` = JDK 17).

### 7.3 Testing & verification
- `npm run test` — Vitest suite covering store mutations, grid snapping, and the simulation engine: flow model, cache offload, time series, incident windows, distributed trace, traffic multiplier, and per-type component mechanics (all 34 types).
- `tsc && vite build` — type-check and production build.
- `mvn -o package` — backend compile + tests (`EventSchedulerTest`).
