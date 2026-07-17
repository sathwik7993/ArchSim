# DesignLab ArchSim

ArchSim is an interactive **distributed-systems simulation workbench** — design an architecture on an infinite canvas, simulate traffic flowing through it, and watch every component behave like the real thing. It doubles as a **system-design interview trainer**: practice 148 real problems, sketch your solution on the canvas, then compare it against a complete reference architecture.

The repository keeps the original product specifications in `ArchSim/` (see also `documentation.md`) and implements the runnable application as two root-level projects:

- `frontend`: React 18 + TypeScript + Vite + Zustand (served by nginx in Docker).
- `backend`: Java 17 + Spring Boot 3 (Postgres 16 + Redis 7, Flyway migrations).

## Features

### Design & simulation
- **Design canvas** — 34 component types (compute, networking, storage, DB, cache, messaging, monitoring, security, Kubernetes), drag-to-pan on a dot grid, pinch/scroll zoom that stays inside the canvas, minimap, undo/redo, custom SVG icons, dark/light theme.
- **Live simulation** — a deterministic client-side flow engine: traffic flows from clients through links, each component has a capacity derived from its specs, and saturation drives CPU / queue depth / error rate. Animated packets travel the links; node load rings glow green → amber → red.
- **Realistic component mechanics** — per-type telemetry: cache hit ratio & evictions (a cache in front of a DB visibly offloads it), DB connection pools / WAL / lock waits / replication lag, Kafka consumer lag, storage IOPS, gateway rate-limiting, and more.
- **Interactive diagnostics** — a **timeline** to play / pause / step / scrub a run, a **traffic slider** to scale load live, **chaos injection** (CPU spike, memory leak, packet loss, node kill), and a **distributed-trace** latency waterfall.
- **Autoscaling** — opt in `auto_scaling` on a compute node and watch it scale out under load (reactive, with realistic scale-up lag) — its instance count climbs on the node and saturation drops.
- **Design insights** — an estimated **monthly cost** breakdown driven by each component's config (a read replica or a broker fleet visibly costs more), plus a live **SLO budget** check (critical-path latency, error rate, peak saturation) while simulating.

### Learn & practice
- **Landing page** with an animated architecture hero.
- **Multi-project workspace** — create, rename, duplicate and delete designs; start from curated **templates**; everything is saved locally and (when signed in) synced to your account.
- **Accounts** — optional email/password sign-in; your designs and practice progress follow you across devices. Signed out, the app is fully local-first.
- **Interview problem bank** — 148 real system-design problems in a LeetCode-style list (search / filter by topic & difficulty / progress tracking). Each opens a **split view**: problem description, hints and a gated reference **architecture diagram** on the left, the canvas on the right. "Load onto canvas" drops the reference design in to simulate.
- **Reference architectures** — every practice problem opens beside a complete, simulatable reference design. "Load onto canvas" drops it in so you can run it and compare against your own attempt.

### Backend
Auth (JWT, 30-day sessions), project & canvas persistence with per-user cloud sync, a served problem catalog + progress API, a server-side simulation endpoint, and a rule-based architecture analyzer.

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

## Tests

```powershell
cd frontend && npm run build   # tsc typecheck + production build
cd frontend && npx vitest run  # unit tests (engine, cost, catalog, workspace, AI parsing…)
cd backend  && mvn -o compile  # backend compile
```
