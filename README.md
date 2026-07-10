# DesignLab ArchSim

ArchSim is an interactive **distributed-systems simulation workbench** — design an architecture on an infinite canvas, then simulate traffic flowing through it and watch every component behave like the real thing. The repository keeps the original product specifications in `ArchSim/` (see also `documentation.md`) and implements the runnable application as two root-level projects:

- `frontend`: React + TypeScript + Vite (served by nginx in Docker).
- `backend`: Java 17 + Spring Boot (Postgres + Redis).

## Features

- **Design canvas** — 34 component types (compute, networking, storage, DB, cache, messaging, monitoring, security, Kubernetes), drag-to-pan on a dot grid, delta-proportional trackpad zoom, minimap, undo/redo, custom SVG icons, dark/light theme.
- **Live simulation** — a deterministic client-side flow engine: traffic flows from clients through links, each component has a capacity derived from its specs, and saturation drives CPU / queue depth / error rate. Animated packets travel the links; node load rings glow green → amber → red.
- **Realistic component mechanics** (Milestone 3) — per-type telemetry: cache hit ratio & evictions (a cache in front of a DB offloads it), DB connection pools / WAL / lock waits / replication lag, Kafka consumer lag, storage IOPS, gateway rate-limiting, and more.
- **Interactive diagnostics** (Milestone 4) — a **timeline** to play / pause / step / scrub a run, a **traffic slider** to scale load live, **chaos injection** (CPU spike, memory leak, packet loss, node kill), and a **distributed-trace** latency waterfall.
- **Backend** — auth (JWT), project & canvas persistence, a server-side simulation endpoint, and a rule-based architecture analyzer.

## Run everything (one command)

From the repository root:

```powershell
docker compose up --build -d
```

Then open **http://localhost:5173**.

This builds and starts all four services — `postgres`, `redis`, `backend`, `frontend` — in the correct order (the backend waits for the database to be healthy, and the frontend's nginx proxies `/api` and `/ws` to the backend). No local `mvn` or `npm` needed.

Common commands:

```powershell
docker compose logs -f        # tail logs
docker compose ps             # service status
docker compose down           # stop everything
docker compose up -d          # start again (no rebuild)
docker compose up -d --build  # rebuild after code changes
```

Ports: frontend `5173`, backend `8080`, postgres `5432`, redis `6379`.

## Local development (optional, without Docker for the apps)

```powershell
docker compose up -d postgres redis   # just the datastores
cd backend && mvn spring-boot:run      # requires JAVA_HOME = JDK 17
cd frontend && npm install && npm run dev
```

> If `mvn spring-boot:run` fails with `UnsupportedClassVersionError`, stale classes from another JDK are in `backend/target/`; run `mvn -o clean compile` to rebuild with Java 17.
